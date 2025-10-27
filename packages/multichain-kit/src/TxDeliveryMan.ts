import { ContractParamsProvider } from "@redstone-finance/sdk";
import { loggerFactory, RedstoneCommon, RedstoneLogger } from "@redstone-finance/utils";
import { err, Result } from "./Result";

export type ContractUpdateStatus = Result<{ transactionHash: string }, string>;
export type TxDeliveryManUpdateStatus = Result<{ transactionHash: string }, string[]>;

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
    if (this.config.maxTxSendAttempts === 0) {
      throw new Error("Invalid config, `maxTxSendAttempts` needs to be > 0");
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
    operation: (attempt: number) => Promise<Result<T, string>>
  ): Promise<Result<T, string[]>> {
    const errors: string[] = [];

    for (let attempt = 0; attempt < this.config.maxTxSendAttempts; attempt++) {
      this.logger.log(
        `Attempt ${attempt + 1}/${this.config.maxTxSendAttempts} to send transaction`
      );

      try {
        const result = await RedstoneCommon.timeout(
          operation(attempt),
          this.config.expectedTxDeliveryTimeInMs,
          undefined,
          (resolve) =>
            resolve(err(`Invocation timeout after ${this.config.expectedTxDeliveryTimeInMs}ms`))
        );

        this.logger.log(
          `Attempt: ${attempt + 1}, Submission status: ${RedstoneCommon.stringify(result)}`
        );

        if (result.success) {
          return result;
        }

        errors.push(result.err);
      } catch (e) {
        const error = RedstoneCommon.stringifyError(e);
        errors.push(error);
        this.logger.log(
          `Attempt: ${attempt + 1}, Submission status: ${RedstoneCommon.stringify(err({ error }))}`
        );
      }
    }

    return err(errors);
  }
}
