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

export type ExerciseChoiceOptions = {
  offset?: number;
  withCurrentTime?: boolean;
  client?: CantonClient;
  disclosedContractData?: Required<ActiveContractData>[];
  withRetry?: boolean;
  withCaller?: boolean;
};

export type ExerciseChoicesOptions = {
  addCurrentTime?: boolean;
  client?: CantonClient;
  disclosedContractData?: Required<ActiveContractData>[];
  withRetry?: boolean;
};

export abstract class CantonContractAdapter {
  protected readonly logger = loggerFactory("canton-contract-adapter");
  protected activeContractData?: ActiveContractData;

  protected constructor(
    protected readonly client: CantonClient,
    protected readonly interfaceId: string,
    protected readonly templateName: string
  ) {}

  async fetchContractData(actAs: string, offset?: number, client = this.client) {
    return await client.getActiveContractData(
      actAs,
      this.getInterfaceId(),
      this.getCombinedSignatoryContractFilter(),
      offset
    );
  }

  async fetchContractWithPayload<T = unknown>(
    actAs: string,
    offset?: number,
    client = this.client
  ) {
    return await client.getActiveContractWithPayload<T>(
      actAs,
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
    actAs: string,
    offset: number | undefined,
    client: CantonClient,
    fn: (contractId: string) => Promise<T>,
    remainingDepth = RETRY_CONFIG.maxRetries
  ): Promise<T> {
    this.activeContractData ??= await this.fetchContractData(actAs, offset, client);

    try {
      return await fn(this.activeContractData.contractId);
    } catch (error) {
      if (isWrongContractError(error)) {
        this.activeContractData = undefined;

        if (remainingDepth > 0) {
          return await this.withContractDataCaching(actAs, offset, client, fn, remainingDepth - 1);
        }
      }

      throw error;
    }
  }

  protected async exerciseChoice<Res, Arg extends object = object>(
    actAsViewer: string,
    actAsUpdater: string,
    choice: string,
    argument: Arg,
    options: ExerciseChoiceOptions = {}
  ): Promise<Res> {
    const {
      offset,
      withCurrentTime: addCurrentTime = false,
      client = this.client,
      disclosedContractData,
      withRetry = false,
      withCaller = false,
    } = options;

    const finalArgument = withCaller ? ({ ...argument, caller: actAsUpdater } as Arg) : argument;

    return await this.withContractDataCaching(actAsViewer, offset, client, async (contractId) => {
      const timestamp = new Date();
      const commands = CantonContractAdapter.buildCommands(
        [{ choice, argument: finalArgument, contractId }],
        this.getInterfaceId(),
        timestamp,
        addCurrentTime
      );

      const execute = () =>
        client.exerciseChoices<Arg, Res>(actAsUpdater, commands, timestamp, disclosedContractData);

      const results = withRetry ? await this.withRetryAndLogging(execute) : await execute();

      const [result] = Object.values(results);
      if (!result) {
        throw new Error(`No result for choice ${choice}`);
      }

      return result;
    });
  }

  protected async exerciseChoices<Res, Arg extends object = object>(
    actAs: string,
    choices: ChoiceInput<Arg>[],
    interfaceId: string,
    options: ExerciseChoicesOptions = {}
  ): Promise<Record<string, Res>> {
    const {
      addCurrentTime = false,
      client = this.client,
      disclosedContractData,
      withRetry = false,
    } = options;

    const timestamp = new Date();
    const commands = CantonContractAdapter.buildCommands(
      choices,
      interfaceId,
      timestamp,
      addCurrentTime
    );

    const execute = () =>
      client.exerciseChoices<Arg, Res>(actAs, commands, timestamp, disclosedContractData);

    return withRetry ? await this.withRetryAndLogging(execute) : await execute();
  }

  protected async exerciseChoiceWithoutWaiting<Arg extends object = object>(
    actAsViewer: string,
    actAsUpdater: string,
    choice: string,
    argument: Arg,
    options: ExerciseChoiceOptions = {}
  ) {
    const {
      offset,
      withCurrentTime: addCurrentTime = false,
      client = this.client,
      disclosedContractData,
      withRetry = false,
    } = options;

    return await this.withContractDataCaching(actAsViewer, offset, client, (contractId) => {
      const timestamp = new Date();
      const commands = CantonContractAdapter.buildCommands(
        [{ choice, argument, contractId }],
        this.getInterfaceId(),
        timestamp,
        addCurrentTime
      );

      const execute = () =>
        client.exerciseChoicesWithoutWaiting<Arg>(
          actAsUpdater,
          commands,
          timestamp,
          disclosedContractData
        );

      return withRetry ? this.withRetryAndLogging(execute) : execute();
    });
  }
}
