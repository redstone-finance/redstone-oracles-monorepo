import { CantonClient } from "../client/CantonClient";
import { CapsRoundHead } from "../utils/capsule-utils";
import { CapsArchiverCantonContractAdapter } from "./CapsArchiverCantonContractAdapter";
import { CapsCapsuleCantonContractAdapter } from "./CapsCapsuleCantonContractAdapter";

const ARCHIVE_CHOICE = "CapsuleArchiver_Archive";
const CAPSULE_ARCHIVER_TEMPLATE = "Caps.CapsuleArchiver:CapsuleArchiver";
const ARCHIVED_NAME = "capsule";

export class CapsCapsuleArchiverCantonContractAdapter extends CapsArchiverCantonContractAdapter {
  private readonly capsuleAdapter: CapsCapsuleCantonContractAdapter;

  constructor(
    client: CantonClient,
    operatorPartyId: string,
    intervalMs: number,
    definition: string
  ) {
    super(
      client,
      client.getDefs().capsCapsuleArchiverId,
      CAPSULE_ARCHIVER_TEMPLATE,
      operatorPartyId,
      intervalMs,
      definition,
      ARCHIVE_CHOICE,
      ARCHIVED_NAME
    );

    this.capsuleAdapter = new CapsCapsuleCantonContractAdapter(client, operatorPartyId, definition);
  }

  protected readStaleIds(roundHead: CapsRoundHead, keptRounds: number, keepPeriodMs: number) {
    return this.capsuleAdapter.readStaleCapsuleIds(roundHead, keptRounds, keepPeriodMs);
  }
}
