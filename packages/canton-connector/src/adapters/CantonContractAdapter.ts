import { FP, loggerFactory, RedstoneCommon } from "@redstone-finance/utils";
import { CantonClient } from "../CantonClient";
import { ContractFilter } from "../price-feed-utils";
import { ActiveContractData, combineIntoId, isWrongContractError } from "../utils";

export const RETRY_CONFIG: Omit<RedstoneCommon.RetryConfig, "fn"> = {
  maxRetries: 5,
  waitBetweenMs: 500,
  backOff: {
    backOffBase: 2,
  },
};

export type ChoiceInput<Arg extends object = object> = {
  choice: string;
  argument: Arg;
  contractId: string;
};

export abstract class CantonContractAdapter {
  protected readonly logger = loggerFactory("canton-contract-adapter");
  protected activeContractData?: ActiveContractData;

  protected constructor(
    protected readonly client: CantonClient,
    protected readonly interfaceId: string,
    protected readonly templateName: string
  ) {}

  async fetchContractData(offset?: number, client = this.client) {
    return await client.getActiveContractData(
      this.getInterfaceId(),
      this.getCombinedSignatoryContractFilter(),
      offset
    );
  }

  protected getInterfaceId() {
    return combineIntoId(this.interfaceId, this.templateName);
  }

  // eslint-disable-next-line @typescript-eslint/class-methods-use-this -- To be overridden
  protected getContractFilter(): ContractFilter {
    return () => true;
  }

  protected getCombinedSignatoryContractFilter(
    signatory = this.client.Defs.signatory
  ): ContractFilter {
    return ((adapter: unknown, signatories) =>
      signatories?.includes(signatory) &&
      this.getContractFilter()(adapter, signatories)) as ContractFilter;
  }

  private static buildCommand<Arg extends object>(
    { choice, argument, contractId }: ChoiceInput<Arg>,
    interfaceId: string,
    timestamp: Date,
    addCurrentTime: boolean
  ) {
    return {
      choice,
      contractId,
      templateId: interfaceId,
      choiceArgument: addCurrentTime
        ? { ...argument, currentTime: timestamp.toISOString() }
        : argument,
    };
  }

  private static buildCommands<Arg extends object>(
    choices: ChoiceInput<Arg>[],
    interfaceId: string,
    timestamp: Date,
    addCurrentTime: boolean
  ) {
    return choices.map((choice) =>
      this.buildCommand(choice, interfaceId, timestamp, addCurrentTime)
    );
  }

  private async withRetryAndLogging<T>(fun: () => Promise<T>) {
    const fn = async () => {
      return FP.mapErr(await FP.tryCallAsync(fun), (error) => {
        if (isWrongContractError(error)) {
          return error;
        }

        throw error;
      });
    };

    try {
      const retryResult = await RedstoneCommon.retry({
        ...RETRY_CONFIG,
        fn,
        logger: (message) => this.logger.info(message),
      })();

      return FP.unwrapOrElse(retryResult, (error) => {
        throw error;
      });
    } catch (error) {
      this.logger.error(`${RedstoneCommon.stringifyError(error)}`);

      throw error;
    }
  }

  private async withContractDataCaching<T>(
    offset: number | undefined,
    client: CantonClient,
    fn: (contractId: string) => Promise<T>,
    remainingDepth = RETRY_CONFIG.maxRetries
  ): Promise<T> {
    this.activeContractData ??= await this.fetchContractData(offset, client);

    try {
      return await fn(this.activeContractData.contractId);
    } catch (error) {
      if (isWrongContractError(error)) {
        this.activeContractData = undefined;

        if (remainingDepth > 0) {
          return await this.withContractDataCaching(offset, client, fn, remainingDepth - 1);
        }
      }

      throw error;
    }
  }

  protected async exerciseChoice<Res, Arg extends object = object>(
    choice: string,
    argument: Arg,
    offset: number | undefined = undefined,
    addCurrentTime = false,
    client = this.client,
    disclosedContractData?: Required<ActiveContractData>[]
  ): Promise<Res> {
    return await this.withContractDataCaching(offset, client, async (contractId) => {
      const results = await this.exerciseChoices<Res, Arg>(
        [{ choice, argument, contractId }],
        this.getInterfaceId(),
        addCurrentTime,
        client,
        disclosedContractData
      );

      const [result] = Object.values(results);
      if (!result) {
        throw new Error(`No result for choice ${choice}`);
      }

      return result;
    });
  }

  protected async exerciseChoiceWithCaller<Res, Arg extends object = object>(
    choice: string,
    argument: Arg,
    offset: number | undefined = undefined,
    addCurrentTime = false,
    client = this.client,
    disclosedContractData?: Required<ActiveContractData>[]
  ): Promise<Res> {
    return await this.exerciseChoice<Res, Arg>(
      choice,
      { ...argument, caller: client.partyId } as Arg,
      offset,
      addCurrentTime,
      client,
      disclosedContractData
    );
  }

  protected async exerciseChoices<Res, Arg extends object = object>(
    choices: ChoiceInput<Arg>[],
    interfaceId: string,
    addCurrentTime = false,
    client = this.client,
    disclosedContractData?: Required<ActiveContractData>[]
  ): Promise<Record<string, Res>> {
    const timestamp = new Date();
    const commands = CantonContractAdapter.buildCommands(
      choices,
      interfaceId,
      timestamp,
      addCurrentTime
    );

    return await this.withRetryAndLogging(() =>
      client.exerciseChoices<Arg, Res>(commands, timestamp, disclosedContractData)
    );
  }

  protected async exerciseChoiceWithoutWaiting<Arg extends object = object>(
    choice: string,
    argument: Arg,
    offset: number | undefined = undefined,
    addCurrentTime = false,
    client = this.client,
    disclosedContractData?: Required<ActiveContractData>[]
  ) {
    return await this.withContractDataCaching(offset, client, (contractId) =>
      this.exerciseChoicesWithoutWaiting<Arg>(
        [{ choice, argument, contractId }],
        this.getInterfaceId(),
        addCurrentTime,
        client,
        disclosedContractData
      )
    );
  }

  protected async exerciseChoicesWithoutWaiting<Arg extends object = object>(
    choices: ChoiceInput<Arg>[],
    interfaceId: string,
    addCurrentTime = false,
    client = this.client,
    disclosedContractData?: Required<ActiveContractData>[]
  ) {
    const timestamp = new Date();
    const commands = CantonContractAdapter.buildCommands(
      choices,
      interfaceId,
      timestamp,
      addCurrentTime
    );

    return await this.withRetryAndLogging(() =>
      client.exerciseChoicesWithoutWaiting<Arg>(commands, timestamp, disclosedContractData)
    );
  }
}
