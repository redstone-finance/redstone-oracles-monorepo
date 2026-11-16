import { RedstoneCommon } from "@redstone-finance/utils";
import { CantonClient } from "../client/CantonClient";
import { CantonTrafficMeter } from "../tx/CantonTrafficMeter";
import { makeContractFilter } from "../utils/price-feed-utils";
import { CapsPluginCantonContractAdapter } from "./CapsPluginCantonContractAdapter";
import { DEFS_KEY_FEATURED_APP_RIGHT } from "./CoreClientCantonContractAdapter";

interface RewardFactoryArgument {
  creators: string[];
}

interface CreateRewardsArgument {
  caller: string;
  count: string;
}

const CREATE_REWARDS_CHOICE = "CreateRewards";
const REWARD_FACTORY_INTERFACE = "IRedStoneRewardFactory:IRedStoneRewardFactory";

export class CapsRewardsCantonContractAdapter extends CapsPluginCantonContractAdapter<RewardFactoryArgument> {
  constructor(
    client: CantonClient,
    operatorPartyId: string,
    intervalMs: number,
    private readonly trafficMeter: CantonTrafficMeter
  ) {
    super(
      client,
      client.getDefs().interfaceId,
      REWARD_FACTORY_INTERFACE,
      operatorPartyId,
      intervalMs
    );
  }

  protected override async fetchPluginContract() {
    return await this.client.getActiveContractData<RewardFactoryArgument>(
      this.operatorPartyId,
      this.getInterfaceId(),
      this.getCombinedSignatoryContractFilter()
    );
  }

  protected override getContractFilter() {
    return makeContractFilter((factory: RewardFactoryArgument) =>
      factory.creators.includes(this.operatorPartyId)
    );
  }

  protected async execute() {
    const factory = await this.fetchPluginContract();
    const count = this.trafficMeter.consumeAccumulated();

    if (count === 0) {
      return undefined;
    }

    try {
      const { results, metadata } = await this.trafficMeter.addBackOnFailure(count, () =>
        this.exerciseChoices<string, CreateRewardsArgument>(
          this.operatorPartyId,
          [
            {
              choice: CREATE_REWARDS_CHOICE,
              contractId: factory.contractId,
              argument: { caller: this.operatorPartyId, count: count.toString() },
            },
          ],
          this.getInterfaceId(),
          { disclosedContractData: [this.client.getDefs()[DEFS_KEY_FEATURED_APP_RIGHT]] }
        )
      );
      const [weight] = Object.values(results);

      this.logger.log(`Sent ${count} of paid traffic to the reward factory, weight ${weight}`);

      if (Number(weight) <= 0) {
        this.trafficMeter.addPaidTrafficCost(count);
      }

      return metadata.paidTrafficCost;
    } catch (error) {
      this.logger.error(`Rewards not created: ${RedstoneCommon.stringifyError(error)}`);

      return undefined;
    }
  }
}
