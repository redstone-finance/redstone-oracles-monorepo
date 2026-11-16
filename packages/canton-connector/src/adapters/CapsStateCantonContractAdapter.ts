import { RedstoneCommon } from "@redstone-finance/utils";
import { CantonClient } from "../client/CantonClient";
import { CAPS_ORACLE_STATE_TEMPLATE } from "../utils/capsule-utils";
import { getCantonFeedId } from "../utils/conversions";
import { makeContractFilter } from "../utils/price-feed-utils";
import { CantonContractAdapter } from "./CantonContractAdapter";
import { CapsCapsuleCantonContractAdapter } from "./CapsCapsuleCantonContractAdapter";
import { DamlFeedData } from "./PricesCantonReadOnlyAdapter";

interface OracleStateArgument {
  adapterId: string;
  capsule: string | null;
  writeTimestamp: string;
}

export class CapsStateCantonContractAdapter extends CantonContractAdapter {
  private readonly capsuleAdapter: CapsCapsuleCantonContractAdapter;

  constructor(
    client: CantonClient,
    private readonly actAs: string,
    private readonly adapterId: string,
    private readonly operatorPartyId: string
  ) {
    super(client, client.getDefs().capsOracleId, CAPS_ORACLE_STATE_TEMPLATE);

    this.capsuleAdapter = new CapsCapsuleCantonContractAdapter(client, actAs, adapterId);
  }

  async readFeedData(offset?: number) {
    const { capsule, writeTimestamp } = await this.fetchState(offset);

    if (!RedstoneCommon.isDefined(capsule)) {
      return [] as DamlFeedData;
    }

    const { publishedAt, values } = await this.capsuleAdapter.readDataPoint(capsule, offset);
    const packageTimestamp = Date.parse(publishedAt).toString();

    return Object.entries(values).map(([feedId, { value }]) => [
      getCantonFeedId(feedId),
      [{ priceData: { value, packageTimestamp, writeTimestamp } }],
    ]) as DamlFeedData;
  }

  protected override getContractFilter() {
    return makeContractFilter(
      (createArgument: OracleStateArgument) => createArgument.adapterId === this.adapterId
    );
  }

  private async fetchState(offset?: number) {
    const state = await this.client.getActiveTemplateContractData<OracleStateArgument>(
      this.actAs,
      this.getInterfaceId(),
      this.getCombinedSignatoryContractFilter(this.operatorPartyId),
      offset
    );

    return state.createArgument;
  }
}
