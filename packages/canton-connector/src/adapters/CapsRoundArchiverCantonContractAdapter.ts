import { CantonClient } from "../client/CantonClient";
import { CapsRoundHead } from "../utils/capsule-utils";
import { CapsArchiverCantonContractAdapter } from "./CapsArchiverCantonContractAdapter";
import { CapsRoundCantonContractAdapter } from "./CapsRoundCantonContractAdapter";

const ARCHIVE_CHOICE = "RoundArchiver_Archive";
const ROUND_ARCHIVER_TEMPLATE = "Caps.RoundArchiver:RoundArchiver";
const ARCHIVED_NAME = "round";

export class CapsRoundArchiverCantonContractAdapter extends CapsArchiverCantonContractAdapter {
  private readonly roundAdapter: CapsRoundCantonContractAdapter;

  constructor(
    client: CantonClient,
    operatorPartyId: string,
    intervalMs: number,
    definition: string
  ) {
    super(
      client,
      client.getDefs().capsRoundArchiverId,
      ROUND_ARCHIVER_TEMPLATE,
      operatorPartyId,
      intervalMs,
      definition,
      ARCHIVE_CHOICE,
      ARCHIVED_NAME
    );

    this.roundAdapter = new CapsRoundCantonContractAdapter(client, operatorPartyId, definition);
  }

  protected readStaleIds(roundHead: CapsRoundHead, keptRounds: number, keepPeriodMs: number) {
    return this.roundAdapter.readStaleRoundIds(roundHead, keptRounds, keepPeriodMs);
  }
}
