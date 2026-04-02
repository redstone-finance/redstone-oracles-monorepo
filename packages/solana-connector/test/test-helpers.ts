import { AccountInfo, PublicKey } from "@solana/web3.js";
import {
  CollectableCommitmentOrConfig,
  GetAccountsInfoRequestCollectorDelegate,
} from "../src/GetAccountsInfoRequestCollector";

export function makePublicKey(seed: number): PublicKey {
  const bytes = Buffer.alloc(32, 0);
  bytes.writeUInt32BE(seed, 0);

  return new PublicKey(bytes);
}

export function makeAccountInfo(label: number): AccountInfo<Buffer> {
  return {
    executable: false,
    owner: makePublicKey(255),
    lamports: label,
    data: Buffer.from([label]),
  };
}

export class MockDelegate implements GetAccountsInfoRequestCollectorDelegate {
  calls: PublicKey[][] = [];
  results: Map<string, AccountInfo<Buffer> | null> = new Map();
  delay = 0;
  rejectNext?: Error;

  getAccountsInfoRequestCollectorGetMultipleAccountsInfo(
    publicKeys: PublicKey[],
    _commitmentOrConfig: CollectableCommitmentOrConfig
  ): Promise<(AccountInfo<Buffer> | null)[]> {
    this.calls.push([...publicKeys]);

    if (this.rejectNext) {
      const err = this.rejectNext;
      this.rejectNext = undefined;

      return Promise.reject(err);
    }

    const result = publicKeys.map((pk) => this.results.get(pk.toBase58()) ?? null);

    if (this.delay > 0) {
      return new Promise((resolve) => setTimeout(() => resolve(result), this.delay));
    }

    return Promise.resolve(result);
  }
}
