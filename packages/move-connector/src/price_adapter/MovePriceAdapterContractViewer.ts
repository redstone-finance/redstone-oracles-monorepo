import { AccountAddress, MoveVector } from "@aptos-labs/ts-sdk";
import { hexlify } from "@ethersproject/bytes";
import { ContractData } from "@redstone-finance/sdk";
import { loggerFactory, RedstoneCommon } from "@redstone-finance/utils";
import { BigNumber } from "ethers";
import { MoveClient } from "../MoveClient";
import { MoveContractViewer } from "../MoveContractViewer";
import { PriceDataSchema } from "../types";
import { makeFeedIdBytes } from "../utils";

export class MovePriceAdapterContractViewer extends MoveContractViewer {
  protected readonly logger = loggerFactory("move-price-adapter-contract-viewer");

  constructor(
    client: MoveClient,
    packageAddress: string,
    private readonly priceAdapterObjectAddress: string
  ) {
    super(client, "price_adapter", packageAddress);
  }

  async viewUniqueSignerThreshold(): Promise<number> {
    const [data] = await this.viewOnChain<string[]>("signer_count_threshold");
    return parseInt(data);
  }

  async viewContractData(feedIds: string[]): Promise<ContractData> {
    const contractData: ContractData = {};
    for (const feedId of feedIds) {
      const data = await this.viewFeedContractData(feedId);
      if (data === undefined) {
        continue;
      }
      contractData[feedId] = {
        lastDataPackageTimestampMS: parseInt(data.write_timestamp),
        lastBlockTimestampMS: parseInt(data.timestamp),
        lastValue: BigNumber.from(data.value).toBigInt(),
      };
    }
    return contractData;
  }

  private async viewFeedContractData(feedId: string): Promise<PriceDataSchema | undefined> {
    try {
      const [data] = await this.viewOnChain<PriceDataSchema[]>("price_data_by_address", [
        AccountAddress.fromString(this.priceAdapterObjectAddress),
        MoveVector.U8(hexlify(makeFeedIdBytes(feedId))),
      ]);

      return data;
    } catch (e) {
      this.logger.error(
        `"Data for FeedId ${feedId} could not be retrieved: ${RedstoneCommon.stringifyError(e)}`
      );
    }

    return undefined;
  }
}
