import {
  AccountAddress,
  Aptos,
  EntryFunctionArgumentTypes,
  MoveValue,
  MoveVector,
  SimpleEntryFunctionArgumentTypes,
} from "@aptos-labs/ts-sdk";
import { hexlify } from "@ethersproject/bytes";
import { ContractData } from "@redstone-finance/sdk";
import { loggerFactory } from "@redstone-finance/utils";
import { BigNumber } from "ethers";
import { IMovementViewContractAdapter, PriceDataSchema } from "./types";
import { makeFeedIdBytes } from "./utils";

export class MovementViewContractAdapter
  implements IMovementViewContractAdapter
{
  protected readonly logger = loggerFactory("movement-contract-adapter");

  constructor(
    private readonly client: Aptos,
    private readonly priceAdapterPackageAddress: AccountAddress,
    private readonly priceAdapterObjectAddress: AccountAddress
  ) {}

  private async viewOnChain<T extends Array<MoveValue> = Array<MoveValue>>(
    moduleName: string,
    functionName: string,
    functionArguments?: Array<
      EntryFunctionArgumentTypes | SimpleEntryFunctionArgumentTypes
    >
  ): Promise<T> {
    return await this.client.view({
      payload: {
        function: `${this.priceAdapterPackageAddress}::${moduleName}::${functionName}`,
        typeArguments: [],
        functionArguments: functionArguments ? functionArguments : [],
      },
    });
  }

  async viewUniqueSignerThreshold(): Promise<number> {
    const [data] = await this.viewOnChain<string[]>(
      "price_adapter",
      "signer_count_threshold"
    );
    return parseInt(data);
  }

  async viewContractData(feedIds: string[]): Promise<ContractData> {
    const contractData: ContractData = {};
    for (const feedId of feedIds) {
      const [data] = await this.viewOnChain<PriceDataSchema[]>(
        "price_adapter",
        "price_data_by_address",
        [
          this.priceAdapterObjectAddress,
          MoveVector.U8(hexlify(makeFeedIdBytes(feedId))),
        ]
      );
      contractData[feedId] = {
        lastDataPackageTimestampMS: parseInt(data.write_timestamp),
        lastBlockTimestampMS: parseInt(data.timestamp),
        lastValue: BigNumber.from(data.value),
      };
    }
    return contractData;
  }
}
