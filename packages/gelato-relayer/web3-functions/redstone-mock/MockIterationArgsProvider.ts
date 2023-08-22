import { Web3FunctionUserArgs } from "@gelatonetwork/web3-functions-sdk";
import { providers } from "ethers";
import {
  IterationArgs,
  IterationArgsProviderEnv,
  IterationArgsProviderInterface,
} from "../IterationArgsProviderInterface";

export class MockIterationArgsProvider
  implements IterationArgsProviderInterface<string | undefined>
{
  constructor(public adapterContractAddress?: string) {}

  async getArgs(
    userArgs: Web3FunctionUserArgs,
    env: IterationArgsProviderEnv,
    provider: providers.StaticJsonRpcProvider
  ): Promise<IterationArgs<string | undefined>> {
    const { shouldUpdatePrices, message, args } = userArgs;

    const resultShouldUpdatePrices = shouldUpdatePrices as unknown as boolean;
    const resultMessage =
      message === "undefined" ? undefined : (message as unknown as string);
    const resultArgs =
      args === "undefined" ? undefined : (args as unknown as string);

    return {
      shouldUpdatePrices: resultShouldUpdatePrices,
      message: resultMessage,
      args: resultArgs,
    };
  }

  getTransactionData(args: string): Promise<string | undefined> {
    return Promise.resolve(args);
  }
}
