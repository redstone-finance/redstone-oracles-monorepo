import { CantonClient } from "../CantonClient";
import { INTERFACE_ID } from "../defs";

export type ContractFilter = (createArgument: unknown) => boolean;

export abstract class CantonContractAdapter {
  protected contractId?: string;

  protected constructor(
    protected readonly client: CantonClient,
    protected readonly interfaceId = INTERFACE_ID,
    protected readonly templateName: string
  ) {}

  async fetchContractId(client = this.client) {
    return await client.getActiveContractId(this.getInterfaceId(), this.getContractFilter());
  }

  protected getInterfaceId() {
    return `${this.interfaceId}:${this.templateName}`;
  }

  protected abstract getContractFilter(): ContractFilter;
}
