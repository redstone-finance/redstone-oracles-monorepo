import { ContractData, ContractParamsProvider } from "@redstone-finance/sdk";
import { Contract } from "starknet";
import { FEE_MULTIPLIER } from "../StarknetContractConnector";
import { extractNumbers, getNumberFromStarknetResult } from "../starknet-utils";

export class PriceAdapterStarknetContractAdapter {
  constructor(private readonly contract: Contract) {}

  async writePricesFromPayloadToContract(paramsProvider: ContractParamsProvider): Promise<string> {
    return (
      await this.contract.invoke(
        "write_prices",
        [paramsProvider.getHexlifiedFeedIds(), await paramsProvider.getPayloadData()],
        { maxFee: 0.0004 * FEE_MULTIPLIER, parseRequest: true }
      )
    ).transaction_hash;
  }

  async getPricesFromPayload(paramsProvider: ContractParamsProvider): Promise<bigint[]> {
    return extractNumbers(
      await this.contract.call("get_prices", [
        paramsProvider.getHexlifiedFeedIds(),
        await paramsProvider.getPayloadData(),
      ])
    );
  }

  async readPricesFromContract(paramsProvider: ContractParamsProvider): Promise<bigint[]> {
    return extractNumbers(
      await this.contract.call("read_prices", [paramsProvider.getHexlifiedFeedIds()])
    );
  }

  async readTimestampFromContract(): Promise<number> {
    return getNumberFromStarknetResult(await this.contract.call("read_timestamp"));
  }

  // eslint-disable-next-line @typescript-eslint/class-methods-use-this -- for interface
  getUniqueSignerThreshold(_blockNumber?: number): Promise<number> {
    throw new Error("Method not supported on Starknet");
  }

  // eslint-disable-next-line @typescript-eslint/class-methods-use-this -- for interface
  readLatestUpdateBlockTimestamp(
    _feedId?: string,
    _blockNumber?: number
  ): Promise<number | undefined> {
    throw new Error("Method not supported on Starknet");
  }

  // eslint-disable-next-line @typescript-eslint/class-methods-use-this -- for interface
  getSignerAddress(): Promise<string> {
    throw new Error("Method not supported on Starknet");
  }

  // eslint-disable-next-line @typescript-eslint/class-methods-use-this -- for interface
  getDataFeedIds(_blockTag?: number): Promise<string[] | undefined> {
    throw new Error("Method not supported on Starknet");
  }

  // eslint-disable-next-line @typescript-eslint/class-methods-use-this -- for interface
  readContractData(
    _feedIds: string[],
    _blockNumber?: number,
    _withDataFeedValues?: boolean
  ): Promise<ContractData> {
    throw new Error("Method not supported on Starknet");
  }
}
