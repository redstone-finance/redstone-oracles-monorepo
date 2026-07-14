import { VersionedTransaction } from "@solana/web3.js";

export interface SolanaTxSender {
  readonly maxFeeds: number;
  send(transactions: VersionedTransaction[]): Promise<string>;
}
