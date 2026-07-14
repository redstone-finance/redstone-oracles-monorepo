import { PriceFeedAdapter } from "@redstone-finance/multichain-kit";
import { ContractParamsProvider } from "@redstone-finance/sdk";
import { PublicKey } from "@solana/web3.js";
import { SolanaClient } from "../client/SolanaClient";
import { bigIntFromBeBytes } from "../utils";
import { decodePriceData } from "./PriceData";

export class SolanaPriceFeedContractAdapter implements PriceFeedAdapter {
  private readonly priceAccount: PublicKey;

  constructor(
    private readonly client: SolanaClient,
    priceFeedAddress: string
  ) {
    this.priceAccount = new PublicKey(priceFeedAddress);
  }

  static fromClientAndAddress(client: SolanaClient, priceFeedAddress: string) {
    return new SolanaPriceFeedContractAdapter(client, priceFeedAddress);
  }

  async getPriceAndTimestamp(slot?: number) {
    const data = await this.readPriceData(slot);

    return {
      value: bigIntFromBeBytes(data.value),
      timestamp: data.timestamp.toNumber(),
    };
  }

  async getDecimals(slot?: number) {
    const data = await this.readPriceData(slot);

    return data.decimals;
  }

  getDescription(_slot?: number): Promise<string | undefined> {
    return Promise.resolve(undefined);
  }

  async getDataFeedId(slot?: number) {
    const data = await this.readPriceData(slot);

    return ContractParamsProvider.unhexlifyFeedId(Buffer.from(data.feedId));
  }

  private async readPriceData(slot?: number) {
    return await this.client.getAccountInfo(
      this.priceAccount,
      (info) => decodePriceData(info.data),
      slot,
      `priceFeed at ${this.priceAccount.toBase58()}`
    );
  }
}
