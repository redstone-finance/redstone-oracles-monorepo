import { loggerFactory, RedstoneCommon } from "@redstone-finance/utils";
import { CantonClient } from "../CantonClient";
import { ActiveContractData, isContractNotFoundError } from "../utils";

export type ContractFilter = (createArgument: unknown) => boolean;

const RETRY_CONFIG: Omit<RedstoneCommon.RetryConfig, "fn"> = {
  maxRetries: 3,
  waitBetweenMs: 100,
  backOff: {
    backOffBase: 1.5,
  },
};

export abstract class CantonContractAdapter {
  protected readonly logger = loggerFactory("canton-contract-adapter");
  protected activeContractData?: ActiveContractData;

  protected constructor(
    protected readonly client: CantonClient,
    protected readonly interfaceId: string,
    protected readonly templateName: string
  ) {}

  async fetchContractData(client = this.client) {
    return await client.getActiveContractData(this.getInterfaceId(), this.getContractFilter());
  }

  protected getInterfaceId() {
    return `${this.interfaceId}:${this.templateName}`;
  }

  protected abstract getContractFilter(): ContractFilter;

  protected async exerciseChoice<Arg extends object, Res>(
    choice: string,
    argument: Arg,
    addCurrentTime = false,
    client = this.client,
    disclosedContractData?: ActiveContractData
  ) {
    return await RedstoneCommon.retry({
      ...RETRY_CONFIG,
      fn: async () =>
        await this.performExerciseChoice<Arg, Res>(
          choice,
          argument,
          addCurrentTime,
          client,
          disclosedContractData
        ),
    })();
  }

  private async performExerciseChoice<Arg extends object, Res>(
    choice: string,
    argument: Arg,
    addCurrentTime = false,
    client = this.client,
    disclosedContractData?: ActiveContractData
  ) {
    this.activeContractData ??= await this.fetchContractData(client);
    const timestamp = new Date();

    const choiceArgument = addCurrentTime
      ? { ...argument, currentTime: timestamp.toISOString() }
      : argument;

    try {
      const result: Res = await client.exerciseChoice(
        {
          choice,
          contractId: this.activeContractData.contractId,
          choiceArgument,
          templateId: this.getInterfaceId(),
        },
        timestamp,
        disclosedContractData?.createdEventBlob
          ? [
              {
                contractId: disclosedContractData.contractId,
                createdEventBlob: disclosedContractData.createdEventBlob,
                synchronizerId: disclosedContractData.synchronizerId,
              },
            ]
          : undefined
      );

      return result;
    } catch (error) {
      this.logger.error(RedstoneCommon.stringifyError(error));

      if (isContractNotFoundError(error)) {
        this.activeContractData = undefined;
      }

      throw error;
    }
  }
}
