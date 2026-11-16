import { RedstoneCommon } from "@redstone-finance/utils";
import { CantonClient } from "../client/CantonClient";
import { CAPSULE_INTERFACE, CapsRoundHead, selectStaleCapsContracts } from "../utils/capsule-utils";
import { CapsApiCantonContractAdapter } from "./CapsApiCantonContractAdapter";

interface CapsuleArgument {
  content: {
    dataPoint: {
      publishedAt: string;
      values: Record<string, { value: string }>;
    };
  };
}

export class CapsCapsuleCantonContractAdapter extends CapsApiCantonContractAdapter {
  constructor(client: CantonClient, actAs: string, definition: string) {
    super(client, CAPSULE_INTERFACE, actAs, definition);
  }

  async readStaleCapsuleIds(roundHead: CapsRoundHead, keptRounds: number, keepPeriodMs: number) {
    const capsules = await this.fetchDefinitionContracts();

    return selectStaleCapsContracts(capsules, roundHead, keptRounds, keepPeriodMs).map(
      ({ contractId }) => contractId
    );
  }

  async readDataPoint(capsule: string, offset?: number) {
    const capsuleData = await this.client.getCreatedContractData<CapsuleArgument>(
      this.actAs,
      this.getInterfaceId(),
      capsule,
      undefined,
      offset
    );

    return RedstoneCommon.assertThenReturn(capsuleData, `Capsule ${capsule} not found`)
      .createArgument.content.dataPoint;
  }
}
