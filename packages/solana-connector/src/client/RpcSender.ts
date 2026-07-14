import { RedstoneCommon } from "@redstone-finance/utils";
import { VersionedTransaction } from "@solana/web3.js";
import { SolanaClient } from "./SolanaClient";
import { SolanaTxSender } from "./SolanaTxSender";

const FEEDS_PER_TRANSACTION = 1;

export class RpcSender implements SolanaTxSender {
  readonly maxFeeds = FEEDS_PER_TRANSACTION;

  constructor(private readonly client: SolanaClient) {}

  async send(transactions: VersionedTransaction[]) {
    RedstoneCommon.assert(
      transactions.length === FEEDS_PER_TRANSACTION,
      `RpcSender expects a single transaction, got ${transactions.length}`
    );

    return await this.client.sendTransaction(transactions[0], { skipPreflight: true });
  }
}
