import { CantonClient } from "../client/CantonClient";
import { CapsRoundArgument } from "../utils/capsule-utils";
import { makeDefinitionFilter } from "../utils/price-feed-utils";
import { CantonContractAdapter } from "./CantonContractAdapter";

export abstract class CapsApiCantonContractAdapter extends CantonContractAdapter {
  protected constructor(
    client: CantonClient,
    interfaceName: string,
    protected readonly actAs: string,
    private readonly definition: string,
    private readonly signatory = actAs
  ) {
    super(client, client.getDefs().capsInterfaceId, interfaceName);
  }

  protected async fetchDefinitionContracts() {
    const contracts = await this.client.getActiveContractsData<CapsRoundArgument>(
      this.actAs,
      this.getInterfaceId(),
      this.getDefinitionFilter()
    );

    return contracts.map(({ createdEvent }) => createdEvent);
  }

  private getDefinitionFilter() {
    return makeDefinitionFilter(this.definition, this.signatory);
  }
}
