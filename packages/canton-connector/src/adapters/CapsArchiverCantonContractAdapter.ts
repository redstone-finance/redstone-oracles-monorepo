import { RedstoneCommon } from "@redstone-finance/utils";
import { CantonClient } from "../client/CantonClient";
import { CapsRoundHead } from "../utils/capsule-utils";
import { CapsDefinitionPluginCantonContractAdapter } from "./CapsDefinitionPluginCantonContractAdapter";
import { CapsRoundHeadCantonContractAdapter } from "./CapsRoundHeadCantonContractAdapter";

interface ArchiverArgument {
  definition: string;
  keptRounds: string;
  keepPeriod: { microseconds: string };
}

export abstract class CapsArchiverCantonContractAdapter extends CapsDefinitionPluginCantonContractAdapter<ArchiverArgument> {
  private readonly roundHeadAdapter: CapsRoundHeadCantonContractAdapter;

  protected constructor(
    client: CantonClient,
    packageId: string,
    templateName: string,
    operatorPartyId: string,
    intervalMs: number,
    definition: string,
    private readonly archiveChoice: string,
    private readonly archivedName: string
  ) {
    super(client, packageId, templateName, operatorPartyId, intervalMs, definition);

    this.roundHeadAdapter = new CapsRoundHeadCantonContractAdapter(
      client,
      operatorPartyId,
      definition
    );
  }

  protected async execute() {
    const archiver = await this.fetchPluginContract();
    const { keptRounds, keepPeriod } = archiver.createArgument;
    const roundHead = await this.roundHeadAdapter.readRoundHead();
    const staleIds = await this.readStaleIds(
      roundHead,
      Number(keptRounds),
      RedstoneCommon.microsecsToMs(Number(keepPeriod.microseconds))
    );

    if (staleIds.length === 0) {
      return undefined;
    }

    const { metadata } = await this.exerciseChoices(
      this.operatorPartyId,
      [
        {
          choice: this.archiveChoice,
          contractId: archiver.contractId,
          argument: {
            actor: this.operatorPartyId,
            roundHead: roundHead.id,
            [`${this.archivedName}s`]: staleIds,
          },
        },
      ],
      this.getInterfaceId()
    );

    this.logger.log(`Archived ${RedstoneCommon.getNS(staleIds.length, this.archivedName)}`);

    return metadata.paidTrafficCost;
  }

  protected abstract readStaleIds(
    roundHead: CapsRoundHead,
    keptRounds: number,
    keepPeriodMs: number
  ): Promise<string[]>;
}
