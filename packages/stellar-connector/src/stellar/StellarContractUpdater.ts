import { ContractUpdater, ContractUpdateStatus } from "@redstone-finance/multichain-kit";
import { ContractParamsProvider } from "@redstone-finance/sdk";
import { FP } from "@redstone-finance/utils";
import { Contract } from "@stellar/stellar-sdk";
import * as XdrUtils from "../XdrUtils";
import {
  StellarContractUpdateContext,
  StellarTransactionExecutor,
} from "./StellarTransactionExecutor";

const WRITE_PRICES_METHOD = "write_prices";

export class StellarContractUpdater implements ContractUpdater<StellarContractUpdateContext> {
  constructor(
    private readonly executor: StellarTransactionExecutor,
    private readonly contract: Contract
  ) {}

  async update(
    paramsProvider: ContractParamsProvider,
    context: StellarContractUpdateContext
  ): Promise<ContractUpdateStatus> {
    const updater = XdrUtils.addressToScVal(await this.executor.getPublicKey());

    const args = await this.prepareCallArgs(paramsProvider, context.updateStartTimeMs);
    const operation = this.contract.call(WRITE_PRICES_METHOD, updater, ...args);
    const attempt = this.executor.executeOperation(operation, context);

    const updateResult = await FP.tryAwait(attempt);

    return FP.mapStringifyError(updateResult, (result) => ({
      transactionHash: result.hash,
    }));
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
