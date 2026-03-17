import { ContractParamsProvider, UpdatePricesOptions } from "@redstone-finance/sdk";
import { LegacyIContractConnector, LegacyIRedstoneContractAdapter } from "../LegacyInterfaces";
import { WriteContractAdapter } from "../WriteContractAdapter";

export class ForwardCompatibleFromRedstoneAdapter implements WriteContractAdapter {
  constructor(
    private readonly adapter: LegacyIRedstoneContractAdapter,
    private readonly getBlock: () => Promise<number>
  ) {}

  static async fromConnector(connector: LegacyIContractConnector<LegacyIRedstoneContractAdapter>) {
    const getBlockNumber = connector.getBlockNumber.bind(connector);

    const adapter = await connector.getAdapter();

    return new ForwardCompatibleFromRedstoneAdapter(adapter, getBlockNumber);
  }

  async readContractData(feedIds: string[], blockNumber?: number, withDataFeedValues?: boolean) {
    return await this.adapter.readContractData(
      feedIds,
      blockNumber ?? (await this.getBlockNumber()),
      withDataFeedValues ?? true
    );
  }

  async getUniqueSignerThreshold(blockNumber?: number) {
    return await this.adapter.getUniqueSignerThreshold(blockNumber);
  }

  async getDataFeedIds(blockNumber?: number) {
    return await this.adapter.getDataFeedIds?.(blockNumber ?? (await this.getBlockNumber()));
  }

  async writePricesFromPayloadToContract(
    paramsProvider: ContractParamsProvider,
    options?: UpdatePricesOptions
  ) {
    const result = await this.adapter.writePricesFromPayloadToContract(paramsProvider, options);

    return String(result);
  }

  async getSignerAddress() {
    const address = await this.adapter.getSignerAddress();
    if (!address) {
      throw new Error("Signer address not available on underlying adapter");
    }

    return address;
  }

  getPricesFromPayload(_paramsProvider: ContractParamsProvider): Promise<bigint[]> {
    throw new Error("getPricesFromPayload not available on OldIRedstoneContractAdapter");
  }

  readPricesFromContract(
    _paramsProvider: ContractParamsProvider,
    _blockNumber?: number
  ): Promise<bigint[]> {
    throw new Error("readPricesFromContract not available on OldIRedstoneContractAdapter");
  }

  readTimestampFromContract(_feedId?: string, _blockNumber?: number): Promise<number> {
    throw new Error("readTimestampFromContract not available on OldIRedstoneContractAdapter");
  }

  readLatestUpdateBlockTimestamp(
    _feedId?: string,
    _blockNumber?: number
  ): Promise<number | undefined> {
    throw new Error("readLatestUpdateBlockTimestamp not available on OldIRedstoneContractAdapter");
  }

  async getBlockNumber() {
    return await this.getBlock();
  }

  getInnerLegacyAdapter() {
    return this.adapter;
  }
}
