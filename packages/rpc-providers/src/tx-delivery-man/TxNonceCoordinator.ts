import { loggerFactory, RedstoneCommon } from "@redstone-finance/utils";
import { providers } from "ethers";
import { TxDeliveryOpts } from "./common";
import {
  LATEST_BLOCK_TAG,
  NonceFetcher,
  PENDING_BLOCK_TAG,
  SupportedBlockTag,
} from "./NonceFetcher";
import type { TxDeliverySigner } from "./TxDelivery";

const logger = loggerFactory("TxNonceCoordinator");
const DEFAULT_STALE_TX_THRESHOLD_MS = 10_000;
const RECONCILE_INTERVAL_MS = 500;
// max number of pending nonces processed in a single reconcile tick
const RECONCILE_MAX_PENDING_PER_TICK = 100;
// hard cap for tracked nonces
const MAX_NONCES_TRACKED = 1_000;
// max attempts per nonce
const MAX_NONCE_ATTEMPTS = 6;
const TX_STATUS_OK = 1;

type PendingNonce = {
  // transactions hashes associated with this nonce
  hashes: string[];
  // last updated timestamp
  updatedAt: number;
  // number of attempts made for this nonce
  attempts: number;
};

export type AllocatedNonce = {
  nonce: number;
  attempt: number;
};

/**
 * Coordinates nonce allocation for transaction delivery.
 * - slow mode: always reads nonce from chain
 * - fast mode: tracks and reconciles pending txs locally
 */
export class TxNonceCoordinator {
  // highest nonce considered as used
  private lastUsedNonce: number | undefined;
  private lastConfirmedNonce: number | undefined;
  private readonly pendingNonces = new Map<number, PendingNonce>();
  // prevent concurrent reconciliation runs
  private reconcileInProgress = false;
  // cached signer address
  private address?: string;
  private readonly fastMode: boolean;
  private readonly staleTxThresholdMs: number;
  private readonly nonceFetcher: NonceFetcher;

  constructor(
    private readonly providers: readonly providers.Provider[],
    private readonly signer: TxDeliverySigner,
    opts: Pick<
      TxDeliveryOpts,
      "fastBroadcastMode" | "txNonceStaleThresholdMs" | "getSingleNonceTimeoutMs"
    >
  ) {
    this.nonceFetcher = new NonceFetcher(providers, opts);
    this.fastMode = opts.fastBroadcastMode === true;
    this.staleTxThresholdMs = opts.txNonceStaleThresholdMs ?? DEFAULT_STALE_TX_THRESHOLD_MS;
    if (this.fastMode) {
      setInterval(() => {
        void this.reconcilePendingTransactions();
      }, RECONCILE_INTERVAL_MS);

      void this.reconcilePendingTransactions();
    }
  }

  async allocateNonce(): Promise<AllocatedNonce> {
    if (!this.fastMode) {
      throw new Error("allocating nonce is only supported in fast mode");
    }

    if (this.lastUsedNonce === undefined || this.lastConfirmedNonce === undefined) {
      await this.alignWithChain();
    }

    const next = this.lastUsedNonce! + 1;
    const attempt = this.pendingNonces.get(next)?.attempts ?? 0;

    logger.log(`Allocated nonce=${next} attempt=${attempt}`);
    return { nonce: next, attempt };
  }

  async getNextNonceFromChain(): Promise<number> {
    return await this.getChainNonce(LATEST_BLOCK_TAG);
  }

  registerPendingTx(nonce: number, txHash: string, nonceAttempt: number) {
    if (!this.fastMode) {
      return;
    }
    const now = Date.now();
    this.bumpLastUsedNonce(nonce);
    let pendingNonce = this.pendingNonces.get(nonce);
    if (!pendingNonce) {
      if (this.pendingNonces.size >= MAX_NONCES_TRACKED) {
        throw new Error(`Too many pending nonces being tracked (${this.pendingNonces.size}).`);
      }

      pendingNonce = { hashes: [], updatedAt: now, attempts: 0 };
      this.pendingNonces.set(nonce, pendingNonce);
    }

    if (nonceAttempt > pendingNonce.attempts) {
      throw new Error(
        `Invalid nonceAttempt=${nonceAttempt} for nonce=${nonce}, only ${pendingNonce.attempts} attempts exist`
      );
    }
    if (nonceAttempt === pendingNonce.attempts) {
      if (pendingNonce.attempts >= MAX_NONCE_ATTEMPTS) {
        throw new Error(`Exceeded max attempts (${MAX_NONCE_ATTEMPTS}) for nonce=${nonce}`);
      }
      pendingNonce.attempts++;
    }

    pendingNonce.updatedAt = now;

    if (pendingNonce.hashes.includes(txHash)) {
      logger.log(
        `Pending tx already registered (nonce=${nonce} hash=${txHash} attempt=${nonceAttempt}). Updating timestamp.`
      );
    } else {
      pendingNonce.hashes.push(txHash);
      logger.log(
        `Registered pending tx nonce=${nonce} hash=${txHash} attempt=${nonceAttempt} totalHashes=${pendingNonce.hashes.length} attempts=${pendingNonce.attempts}`
      );
    }
  }

  // -------------------- helpers --------------------

  private async getAddress(): Promise<string> {
    if (!this.address) {
      this.address = await this.signer.getAddress();
    }
    return this.address;
  }

  private bumpLastUsedNonce(nonce: number) {
    if (this.lastUsedNonce === undefined || nonce > this.lastUsedNonce) {
      this.lastUsedNonce = nonce;
    }
  }

  private bumpLastConfirmedNonce(nonce: number) {
    this.bumpLastUsedNonce(nonce);
    if (this.lastConfirmedNonce === undefined || nonce > this.lastConfirmedNonce) {
      this.lastConfirmedNonce = nonce;
    }
  }

  private async reconcilePendingTransactions() {
    if (!this.fastMode || this.reconcileInProgress) {
      return;
    }

    this.reconcileInProgress = true;
    const startedAt = Date.now();

    try {
      const pendingSnapshot = [...this.pendingNonces.entries()].slice(
        0,
        RECONCILE_MAX_PENDING_PER_TICK
      );
      await this.processPendingSnapshot(pendingSnapshot);

      const duration = Date.now() - startedAt;
      logger.log(
        `Reconcile: completed in ${duration} ms (snapshot=${pendingSnapshot.length}, pending=${this.pendingNonces.size})`
      );

      await this.alignWithChain();
    } finally {
      this.reconcileInProgress = false;
    }
  }

  private async processPendingSnapshot(pendingSnapshot: [number, PendingNonce][]) {
    if (pendingSnapshot.length === 0) {
      return;
    }

    let batch: Promise<void>[] = [];
    const maxBatchSize = this.providers.length;

    for (const [nonce, pendingNonce] of pendingSnapshot) {
      const task = this.reconcileSinglePendingNonce(nonce, pendingNonce).catch((e) => {
        logger.warn(
          `Reconcile: failed to reconcile pending txs with nonce=${nonce} hashes=${pendingNonce.hashes.join(",")} error=${String(e)}`
        );
      });

      batch.push(task);

      if (batch.length >= maxBatchSize) {
        await Promise.all(batch);
        batch = [];
      }
    }

    if (batch.length > 0) {
      await Promise.all(batch);
    }
  }

  private async reconcileSinglePendingNonce(nonce: number, pendingNonce: PendingNonce) {
    if (this.lastConfirmedNonce !== undefined && nonce <= this.lastConfirmedNonce) {
      this.pendingNonces.delete(nonce);
      return;
    }

    const providerIndex = nonce % this.providers.length;
    const provider = this.providers[providerIndex];
    // check pending txs in reverse order (most recent first),
    // because previously added were more likely to be dropped
    for (const txHash of [...pendingNonce.hashes].reverse()) {
      await this.checkPendingTxStatus(nonce, txHash, pendingNonce.updatedAt, provider);
    }
  }

  private async checkPendingTxStatus(
    nonce: number,
    txHash: string,
    updatedAt: number,
    provider: providers.Provider
  ) {
    const receipt = await provider.getTransactionReceipt(txHash);

    // tx mined (success or revert)
    if (RedstoneCommon.isDefined(receipt)) {
      this.pendingNonces.delete(nonce);
      this.bumpLastConfirmedNonce(nonce);

      if (receipt.status === TX_STATUS_OK) {
        logger.log(`Confirmed pending tx nonce=${nonce} block=${receipt.blockNumber}`);
      } else {
        logger.warn(
          `Tx reverted nonce=${nonce} block=${receipt.blockNumber}, nonce remains consumed`
        );
      }

      return;
    }

    // tx considered stale
    const now = Date.now();
    if (now - updatedAt > this.staleTxThresholdMs) {
      this.lastUsedNonce = nonce - 1;
      logger.warn(
        `Stale tx nonce=${nonce} hash=${txHash}, resetting lastUsedNonce to ${this.lastUsedNonce}`
      );
    }
  }

  private async alignWithChain() {
    const [pendingChainNonce, latestChainNonce] = await Promise.all([
      this.getChainNonce(PENDING_BLOCK_TAG),
      this.getChainNonce(LATEST_BLOCK_TAG),
    ]);
    if (this.lastUsedNonce === undefined || pendingChainNonce - 1 > this.lastUsedNonce) {
      this.lastUsedNonce = pendingChainNonce - 1;
      logger.log(`Aligned with pending nonce: lastUsedNonce=${pendingChainNonce - 1}`);
    }
    if (this.lastConfirmedNonce === undefined || latestChainNonce - 1 > this.lastConfirmedNonce) {
      this.lastConfirmedNonce = latestChainNonce - 1;
      logger.log(`Aligned with latest nonce: lastConfirmedNonce=${latestChainNonce - 1}`);
    }
    if (this.lastConfirmedNonce > this.lastUsedNonce) {
      this.lastUsedNonce = this.lastConfirmedNonce;
    }
  }

  private async getChainNonce(blockTag: SupportedBlockTag) {
    const address = await this.getAddress();

    return await this.nonceFetcher.fetchNonceFromChain(address, blockTag);
  }
}
