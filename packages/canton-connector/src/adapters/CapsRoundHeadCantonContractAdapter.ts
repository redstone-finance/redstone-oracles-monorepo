import { CantonClient } from "../client/CantonClient";
import { getCapsRoundNumber, getCreatedAtMs, ROUND_HEAD_INTERFACE } from "../utils/capsule-utils";
import { CapsApiCantonContractAdapter } from "./CapsApiCantonContractAdapter";

export class CapsRoundHeadCantonContractAdapter extends CapsApiCantonContractAdapter {
  constructor(client: CantonClient, actAs: string, definition: string, signatory = actAs) {
    super(client, ROUND_HEAD_INTERFACE, actAs, definition, signatory);
  }

  async readRoundHead() {
    const roundHeads = await this.fetchDefinitionContracts();
    if (roundHeads.length !== 1) {
      throw new Error(`Expected one round head, found ${roundHeads.length}`);
    }

    const [roundHead] = roundHeads;

    return {
      id: roundHead.contractId,
      roundNumber: getCapsRoundNumber(roundHead),
      createdAtMs: getCreatedAtMs(roundHead),
    };
  }
}
