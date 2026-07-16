import { utils } from "@coral-xyz/anchor";
import { loggerFactory, RedstoneCommon } from "@redstone-finance/utils";
import { Keypair, VersionedTransaction } from "@solana/web3.js";
import { SolanaTxSender } from "../SolanaTxSender";
import { JitoBundleClient } from "./JitoBundleClient";

const MAX_FEEDS_PER_BUNDLE = 4;

export class JitoBundleSender implements SolanaTxSender {
  readonly maxFeeds = MAX_FEEDS_PER_BUNDLE;
  private readonly logger = loggerFactory("jito-bundle-sender");

  constructor(
    private readonly jitoClient: JitoBundleClient,
    private readonly keypair: Keypair
  ) {}

  async send(transactions: VersionedTransaction[]) {
    RedstoneCommon.assert(
      transactions.length <= this.maxFeeds,
      `JitoBundleSender expects at most ${RedstoneCommon.getNS(this.maxFeeds, "transaction")}, got ${transactions.length}`
    );

    const bundleId = await this.jitoClient.sendBundle(transactions, this.keypair);
    this.logger.info(
      `Submitted Jito bundle ${bundleId} with ${RedstoneCommon.getNS(transactions.length, "transaction")}`
    );

    return utils.bytes.bs58.encode(transactions[transactions.length - 1].signatures[0]);
  }
}
