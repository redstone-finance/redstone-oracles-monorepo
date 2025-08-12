import {
  EntryFunctionArgumentTypes,
  MoveValue,
  SimpleEntryFunctionArgumentTypes,
} from "@aptos-labs/ts-sdk";
import { MoveClient } from "./MoveClient";

export abstract class MoveContractViewer {
  protected constructor(
    private readonly client: MoveClient,
    private readonly moduleName: string,
    private readonly packageAddress: string
  ) {}

  protected async viewOnChain<T extends Array<MoveValue> = Array<MoveValue>>(
    functionName: string,
    functionArguments?: Array<
      EntryFunctionArgumentTypes | SimpleEntryFunctionArgumentTypes
    >
  ): Promise<T> {
    return await this.client.viewOnChain(
      this.packageAddress,
      this.moduleName,
      functionName,
      functionArguments
    );
  }
}
