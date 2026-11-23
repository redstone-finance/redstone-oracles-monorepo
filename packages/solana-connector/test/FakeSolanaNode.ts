import {
  Connection,
  Message,
  PublicKey,
  SignaturesForAddressOptions,
  TransactionResponse,
} from "@solana/web3.js";
import { SolanaClient } from "../src";

type FakeBlocks = Partial<Record<number, string[]>>;

export class FakeSolanaNode extends SolanaClient {
  constructor(
    private readonly blocks: FakeBlocks,
    private readonly addressSignatures: Set<string>,
    private readonly newestSlot: number,
    private readonly reportedSlot = newestSlot
  ) {
    super(new Connection("http://localhost"));
  }

  override getSlot() {
    return Promise.resolve(this.reportedSlot);
  }

  override getBlockSignatures(slot: number) {
    const signatures = slot <= this.newestSlot ? this.blocks[slot] : undefined;
    if (!signatures) {
      return Promise.reject(new Error(`Block not available for slot ${slot}`));
    }

    return Promise.resolve({
      blockhash: `hash-${slot}`,
      previousBlockhash: `hash-${slot - 1}`,
      parentSlot: slot - 1,
      signatures,
      blockTime: null,
    });
  }

  override getSignaturesForAddress(_address: PublicKey, options: SignaturesForAddressOptions = {}) {
    if ((options.minContextSlot ?? 0) > this.newestSlot) {
      return Promise.reject(new Error("Minimum context slot has not been reached"));
    }

    const ledger = this.ledger();
    const beforeIndex = options.before
      ? ledger.findIndex(({ signature }) => signature === options.before)
      : ledger.length;
    if (beforeIndex < 0) {
      return Promise.resolve([]);
    }

    const untilIndex = ledger.findIndex(({ signature }) => signature === options.until);

    return Promise.resolve(
      ledger
        .slice(untilIndex + 1, beforeIndex)
        .filter(({ signature }) => this.addressSignatures.has(signature))
        .reverse()
        .slice(0, options.limit)
        .map(({ signature, slot }) => ({ signature, slot, err: null, memo: null }))
    );
  }

  override getTransaction(signature: string) {
    const slot = this.ledger().find((entry) => entry.signature === signature)?.slot ?? 0;
    const response: TransactionResponse = {
      slot,
      blockTime: null,
      meta: null,
      transaction: {
        signatures: [signature],
        message: new Message({
          header: {
            numRequiredSignatures: 1,
            numReadonlySignedAccounts: 0,
            numReadonlyUnsignedAccounts: 0,
          },
          accountKeys: [],
          recentBlockhash: `hash-${slot}`,
          instructions: [],
        }),
      },
    };

    return Promise.resolve(response);
  }

  private ledger() {
    return Object.entries(this.blocks)
      .map(([slot, signatures]) => ({ slot: Number(slot), signatures: signatures ?? [] }))
      .filter(({ slot }) => slot <= this.newestSlot)
      .sort((a, b) => a.slot - b.slot)
      .flatMap(({ slot, signatures }) => signatures.map((signature) => ({ signature, slot })));
  }
}
