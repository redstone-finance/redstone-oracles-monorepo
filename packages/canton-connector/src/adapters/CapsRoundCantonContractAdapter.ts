import { CantonClient } from "../client/CantonClient";
import {
  CapsRoundHead,
  getCapsRoundNumber,
  ROUND_INTERFACE,
  selectStaleCapsContracts,
} from "../utils/capsule-utils";
import { CapsApiCantonContractAdapter } from "./CapsApiCantonContractAdapter";

const GENESIS_ROUND_NUMBER = 0;

export class CapsRoundCantonContractAdapter extends CapsApiCantonContractAdapter {
  constructor(client: CantonClient, actAs: string, definition: string) {
    super(client, ROUND_INTERFACE, actAs, definition);
  }

  async readStaleRoundIds(roundHead: CapsRoundHead, keptRounds: number, keepPeriodMs: number) {
    const rounds = await this.fetchDefinitionContracts();
    const staleRounds = selectStaleCapsContracts(
      rounds.filter((round) => getCapsRoundNumber(round) !== GENESIS_ROUND_NUMBER),
      roundHead,
      keptRounds,
      keepPeriodMs
    );

    return staleRounds.map(({ contractId }) => contractId);
  }
}
