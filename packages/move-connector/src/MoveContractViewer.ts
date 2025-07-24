import {
  Aptos,
  EntryFunctionArgumentTypes,
  MoveValue,
  SimpleEntryFunctionArgumentTypes,
} from "@aptos-labs/ts-sdk";

export abstract class MoveContractViewer {
  protected constructor(
    private readonly client: Aptos,
    private readonly moduleName: string,
    private readonly packageAddress: string
  ) {}

  protected async viewOnChain<T extends Array<MoveValue> = Array<MoveValue>>(
    functionName: string,
    functionArguments?: Array<
      EntryFunctionArgumentTypes | SimpleEntryFunctionArgumentTypes
    >
  ): Promise<T> {
    return await this.client.view({
      payload: {
        function: `${this.packageAddress}::${this.moduleName}::${functionName}`,
        typeArguments: [],
        functionArguments: functionArguments ? functionArguments : [],
      },
    });
  }
}
