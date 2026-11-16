import { CantonClient } from "../client/CantonClient";
import { makeContractFilter } from "../utils/price-feed-utils";
import { CapsPluginCantonContractAdapter } from "./CapsPluginCantonContractAdapter";

export abstract class CapsDefinitionPluginCantonContractAdapter<
  Argument extends { definition: string },
> extends CapsPluginCantonContractAdapter<Argument> {
  protected constructor(
    client: CantonClient,
    packageId: string,
    templateName: string,
    operatorPartyId: string,
    intervalMs: number,
    private readonly definition: string
  ) {
    super(client, packageId, templateName, operatorPartyId, intervalMs);
  }

  protected override getContractFilter() {
    return makeContractFilter((plugin: Argument) => plugin.definition === this.definition);
  }
}
