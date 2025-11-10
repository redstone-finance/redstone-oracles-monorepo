import { ContractParamsProvider } from "@redstone-finance/sdk";
import { FP, loggerFactory, RedstoneCommon, RedstoneLogger } from "@redstone-finance/utils";

export type ContractUpdateStatus = FP.Result<{ transactionHash: string }, string>;
export type TxDeliveryManUpdateStatus = FP.Result<{ transactionHash: string }, string[]>;

export interface ContractUpdater {
  update(
    params: ContractParamsProvider,
    updateStartTimeMs: number,
    attempt: number
  ): Promise<ContractUpdateStatus>;
}

export type TxDeliveryManConfig = {
  maxTxSendAttempts: number;
  expectedTxDeliveryTimeInMs: number;
};

export class TxDeliveryMan {
  private readonly logger: RedstoneLogger;

  constructor(
    private readonly config: TxDeliveryManConfig,
    logTarget: string = "tx-delivery-man"
  ) {
    if (!this.config.maxTxSendAttempts || this.config.maxTxSendAttempts < 0) {
      throw new Error(
        `Invalid config, maxTxSendAttempts should be >0 && defined, is ${this.config.maxTxSendAttempts}`
      );
    }

    this.logger = loggerFactory(logTarget);
  }

  async updateContract(
    updater: ContractUpdater,
    params: ContractParamsProvider
  ): Promise<TxDeliveryManUpdateStatus> {
    const updateStartTimeMs = Date.now();

    return await this.submit((attempt) => updater.update(params, updateStartTimeMs, attempt));
  }

  async submit<T>(
    operation: (attempt: number) => Promise<FP.Result<T, string>>
  ): Promise<FP.Result<T, string[]>> {
    const makeAttempt = (attempt: number) => async () => {
      this.logger.log(
        `Attempt ${attempt + 1}/${this.config.maxTxSendAttempts} to send transaction`
      );

      const wrappedResult = await FP.tryCallAsyncStringifyError(
        async () =>
          await RedstoneCommon.timeout(operation(attempt), this.config.expectedTxDeliveryTimeInMs)
      );
      const result = FP.flatten(wrappedResult);

      this.logger.log(
        `Attempt: ${attempt + 1}, Submission status: ${RedstoneCommon.stringify(result)}`
      );

      return result;
    };

    return await FP.findFirstAsyncApply(
      Array.from({ length: this.config.maxTxSendAttempts }, (_, i) => makeAttempt(i))
    );
  }
}
