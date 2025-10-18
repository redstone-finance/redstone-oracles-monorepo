import { ContractParamsProvider } from "@redstone-finance/sdk";
import { loggerFactory, RedstoneCommon, RedstoneLogger } from "@redstone-finance/utils";

type SuccessResult = {
  success: true;
  transactionHash: string;
};

export type ContractUpdateStatus =
  | SuccessResult
  | {
      success: false;
      error: string;
    };

export type TxDeliveryManUpdateStatus =
  | SuccessResult
  | {
      success: false;
      errors: string[];
    };

export interface ContractUpdater {
  update(
    params: ContractParamsProvider,
    attempt: number,
    updateStartTimeMs: number
  ): Promise<ContractUpdateStatus>;
}

export type TxDeliveryManConfig = {
  maxTxSendAttempts: number;
  expectedTxDeliveryTimeInMs: number;
};

export class TxDeliveryMan {
  private readonly logger: RedstoneLogger;

  constructor(
    private readonly updater: ContractUpdater,
    private readonly config: TxDeliveryManConfig,
    logTarget: string = "tx-delivery-man"
  ) {
    if (this.config.maxTxSendAttempts === 0) {
      throw new Error("Invalid config, `maxTxSendAttempts` needs to be > 0");
    }

    this.logger = loggerFactory(logTarget);
  }

  async submitTransaction(params: ContractParamsProvider): Promise<TxDeliveryManUpdateStatus> {
    let iterationIdx = 0;

    const errors = [];
    const updateStartTimeMs = Date.now();

    while (iterationIdx < this.config.maxTxSendAttempts) {
      const status = await this.trySubmit(iterationIdx, params, updateStartTimeMs);

      this.logger.log(
        `Attempt: ${iterationIdx + 1}, Submittion status: ${RedstoneCommon.stringify(status)}`
      );

      if (status.success) {
        return {
          success: true,
          transactionHash: status.transactionHash,
        };
      } else if (status.error) {
        errors.push(status.error);
      }

      iterationIdx += 1;
    }

    return {
      success: false,
      errors,
    };
  }

  private async trySubmit(
    iterationIdx: number,
    params: ContractParamsProvider,
    updateStartTimeMs: number
  ): Promise<ContractUpdateStatus> {
    this.logger.log(
      `Attempt ${iterationIdx + 1}/${this.config.maxTxSendAttempts} to send transaction`
    );

    return await RedstoneCommon.timeout(
      this.updater.update(params, iterationIdx, updateStartTimeMs),
      this.config.expectedTxDeliveryTimeInMs,
      undefined,
      (resolve) =>
        resolve({
          success: false,
          error: `Invocation timeout after ${this.config.expectedTxDeliveryTimeInMs}`,
        })
    );
  }
}
