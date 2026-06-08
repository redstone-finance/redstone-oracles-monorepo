import { loggerFactory, RedstoneCommon } from "@redstone-finance/utils";
import { Keypair } from "@stellar/stellar-sdk";
import { StellarClient } from "../client/StellarClient";
import { StellarSigner } from "../stellar/StellarSigner";

export class PriceFeedTtlExtender {
  static readonly logger = loggerFactory("stellar-price-feed-ttl-extender");
  private readonly signer: StellarSigner;

  constructor(
    private readonly client: StellarClient,
    private readonly addresses: string[],
    keypair: Keypair
  ) {
    this.signer = new StellarSigner(keypair);
  }

  async extendTtlIfNeeded() {
    if (this.addresses.length === 0) {
      PriceFeedTtlExtender.logger.warn("No price-feed addresses to monitor");

      return;
    }

    const blockNumber = await this.client.getBlockNumber();
    const addressesToExtend = await this.client.getAddressesToExtendInstanceTtl(
      this.addresses,
      blockNumber
    );

    if (addressesToExtend.length === 0) {
      PriceFeedTtlExtender.logger.info("No price-feed contracts need TTL extension");

      return;
    }

    PriceFeedTtlExtender.logger.info(
      `Extending TTL for ${RedstoneCommon.getNS(addressesToExtend.length, "price-feed contract")}: [${addressesToExtend.join(", ")}]`
    );

    await RedstoneCommon.runWithPartialFailure(
      addressesToExtend,
      async (address) => {
        await this.client.extendInstanceTtl(address, this.signer);
      },
      (error) =>
        PriceFeedTtlExtender.logger.error(
          `TTL extension failed: ${RedstoneCommon.stringifyError(error)}`
        ),
      "All price-feed TTL extension attempts failed"
    );
  }
}
