import { ContractUpdater, ContractUpdateStatus, ok } from "@redstone-finance/multichain-kit";
import { ContractParamsProvider } from "@redstone-finance/sdk";
import { RedstoneCommon } from "@redstone-finance/utils";
import { Contract } from "@stellar/stellar-sdk";
import * as XdrUtils from "../XdrUtils";
import { StellarTransactionExecutor } from "./StellarTransactionExecutor";

const MAX_WRITE_PRICES_OPS = 33;

export class StellarContractUpdater implements ContractUpdater {
  constructor(
    private readonly executor: StellarTransactionExecutor,
    private readonly contract: Contract
  ) {}

  async update(
    params: ContractParamsProvider,
    updateStartTimeMs: number
  ): Promise<ContractUpdateStatus> {
    const updater = XdrUtils.addressToScVal(await this.executor.getPublicKey());
    const batchSize = MAX_WRITE_PRICES_OPS / params.requestParams.uniqueSignersCount;
    const paramsProviders = params.splitIntoFeedBatches(batchSize);

    const executors = paramsProviders.map((provider) => async () => {
      const args = await this.prepareCallArgs(provider, updateStartTimeMs);
      const operation = this.contract.call("write_prices", updater, ...args);
      const result = await this.executor.executeOperation(operation);

      return result.hash;
    });

    const txHashes = await RedstoneCommon.batchPromises(1, 0, executors, true);

    return ok({ transactionHash: txHashes[txHashes.length - 1] });
  }

  private async prepareCallArgs(paramsProvider: ContractParamsProvider, metadataTimestamp: number) {
    const feedIdsScVal = XdrUtils.mapArrayToScVec(
      paramsProvider.getDataFeedIds(),
      XdrUtils.stringToScVal
    );

    const payloadScVal = XdrUtils.numbersToScvBytes(
      await paramsProvider.getPayloadData({
        withUnsignedMetadata: true,
        metadataTimestamp,
        componentName: "stellar-connector",
      })
    );

    return [feedIdsScVal, payloadScVal];
  }
}
