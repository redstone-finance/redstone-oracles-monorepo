import { loggerFactory, RedstoneCommon } from "@redstone-finance/utils";
import { providers } from "ethers";
import type { TxDeliverySigner } from "./TxDelivery";
import { TxDeliveryOpts } from "./common";

const logger = loggerFactory("TxNonceCoordinator");
const DEFAULT_STALE_TX_THRESHOLD_MS = 10_000;
const RECONCILE_INTERVAL_MS = 500;
// max number of pending txs processed in a single reconcile tick
const RECONCILE_MAX_PENDING_PER_TICK = 100;
// hard cap for tracked pending txs
const MAX_PENDING_TRACKED = 1_000;

type PendingTx = {
  hash: string;
  addedAt: number;
};

/**
 * Coordinates nonce allocation for transaction delivery.
 * - slow mode: always reads nonce from chain
 * - fast mode: tracks and reconciles pending txs locally
 */
export class TxNonceCoordinator {
  // highest nonce considered as used
  private lastCommittedNonce: number | undefined;
  private readonly pendingTxs = new Map<number, PendingTx>();
  // prevent concurrent reconciliation runs
  private reconcileInProgress = false;
  // cached signer address
  private address?: string;
  private fastMode: boolean;
  private staleTxThresholdMs: number = DEFAULT_STALE_TX_THRESHOLD_MS;

  constructor(
    private readonly providers: readonly providers.JsonRpcProvider[],
    private readonly signer: TxDeliverySigner,
    opts: Pick<TxDeliveryOpts, "fastBroadcastMode" | "txNonceStaleThresholdMs">
  ) {
    this.fastMode = opts.fastBroadcastMode === true;
    this.staleTxThresholdMs = opts.txNonceStaleThresholdMs ?? DEFAULT_STALE_TX_THRESHOLD_MS;
    if (this.fastMode) {
      setInterval(() => {
        void this.reconcilePendingTransactions();
      }, RECONCILE_INTERVAL_MS);

      void this.reconcilePendingTransactions();
    }
  }

  async allocateNonce(): Promise<number> {
    if (!this.fastMode) {
      throw new Error("allocating nonce is only supported in fast mode");
    }

    if (this.lastCommittedNonce === undefined) {
      await this.alignWithChain();
    }

    const next = this.lastCommittedNonce! + 1;
    logger.info(`Allocating nonce=${next}`);
    return next;
  }

  async getNextNonceFromChain(provider: providers.JsonRpcProvider): Promise<number> {
    const address = await this.getAddress();
    return await provider.getTransactionCount(address, "latest");
  }

  registerPendingTx(nonce: number, txHash: string) {
    if (!this.fastMode) {
      return;
    }
    this.bumpLastCommittedNonce(nonce);
    this.pendingTxs.set(nonce, { hash: txHash, addedAt: Date.now() });
    logger.info(`Registered pending tx nonce=${nonce} hash=${txHash}`);
  }

  // -------------------- helpers --------------------

  private async getAddress(): Promise<string> {
    if (!this.address) {
      this.address = await this.signer.getAddress();
    }
    return this.address;
  }

  private bumpLastCommittedNonce(nonce: number) {
    if (this.lastCommittedNonce === undefined || nonce > this.lastCommittedNonce) {
      this.lastCommittedNonce = nonce;
    }
  }

  private async reconcilePendingTransactions() {
    if (!this.fastMode || this.reconcileInProgress || this.pendingTxs.size === 0) {
      return;
    }

    this.reconcileInProgress = true;
    const startedAt = Date.now();

    try {
      this.enforcePendingCap();

      const pendingSnapshot = [...this.pendingTxs.entries()].slice(
        0,
        RECONCILE_MAX_PENDING_PER_TICK
      );
      await this.processPendingSnapshot(pendingSnapshot);

      const duration = Date.now() - startedAt;
      logger.info(
        `Reconcile: completed in ${duration} ms (snapshot=${pendingSnapshot.length}, pending=${this.pendingTxs.size})`
      );

      await this.alignWithChain();
    } finally {
      this.reconcileInProgress = false;
    }
  }

  private enforcePendingCap() {
    if (this.pendingTxs.size <= MAX_PENDING_TRACKED) {
      return;
    }

    const toDrop = this.pendingTxs.size - MAX_PENDING_TRACKED;
    let dropped = 0;

    for (const [nonce] of this.pendingTxs) {
      this.pendingTxs.delete(nonce);
      dropped++;
      if (dropped >= toDrop) {
        break;
      }
    }

    logger.warn(
      `Reconcile: dropped ${dropped} oldest pending tx entries to keep map size under ${MAX_PENDING_TRACKED}`
    );
  }

  private async processPendingSnapshot(pendingSnapshot: [number, PendingTx][]) {
    if (pendingSnapshot.length === 0) {
      return;
    }

    let batch: Promise<void>[] = [];
    const maxBatchSize = this.providers.length;

    for (const [nonce, pending] of pendingSnapshot) {
      const task = this.reconcileSinglePendingTx(nonce, pending).catch((e) => {
        logger.warn(
          `Reconcile: failed to reconcile pending tx nonce=${nonce} hash=${pending.hash} error=${String(e)}`
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

  private async reconcileSinglePendingTx(nonce: number, pending: PendingTx) {
    const providerIndex = nonce % this.providers.length;
    const provider = this.providers[providerIndex];
    const receipt = await provider.getTransactionReceipt(pending.hash);

    // tx mined (success or revert)
    if (RedstoneCommon.isDefined(receipt)) {
      this.pendingTxs.delete(nonce);
      this.bumpLastCommittedNonce(nonce);

      if (receipt.status === 1) {
        logger.info(`Confirmed pending tx nonce=${nonce} block=${receipt.blockNumber}`);
      } else {
        logger.warn(
          `Tx reverted nonce=${nonce} block=${receipt.blockNumber}, nonce remains consumed`
        );
      }

      return;
    }

    // tx considered stale
    const now = Date.now();
    if (now - pending.addedAt > this.staleTxThresholdMs) {
      this.pendingTxs.delete(nonce);
      logger.warn(`Stale tx nonce=${nonce} hash=${pending.hash}, stopping local tracking`);
    }
  }

  private async alignWithChain() {
    const address = await this.getAddress();

    // use max nonce from all providers, tolerate individual failures
    const results = await Promise.allSettled(
      this.providers.map((p) => p.getTransactionCount(address, "pending"))
    );

    const nonces = results
      .filter((r) => r.status === "fulfilled")
      .map((r) => r.value)
      .filter(Number.isFinite);
    if (nonces.length === 0) {
      throw new Error("No valid nonces returned from providers");
    }
    const chainNonce = Math.max(...nonces);

    // chain nonce is ahead — sync local state
    if (this.lastCommittedNonce === undefined || chainNonce > this.lastCommittedNonce + 1) {
      const aligned = chainNonce - 1;
      this.lastCommittedNonce = aligned;
      logger.info(`Aligned: chainNonce=${chainNonce} -> lastCommittedNonce=${aligned}`);
    }
  }
}
