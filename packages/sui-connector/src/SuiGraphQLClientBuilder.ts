import { SuiGraphQLClient } from "@mysten/sui/graphql";
import { ChainTypeEnum, MultiExecutor } from "@redstone-finance/utils";
import { SuiNetworkName } from "./config";
import { getSuiChainId, getSuiNetworkName } from "./network-ids";
import { makeSuiGraphQLClient } from "./util";

export class SuiGraphQLClientBuilder extends MultiExecutor.ClientBuilder<SuiGraphQLClient> {
  protected override chainType = ChainTypeEnum.enum.sui;

  withSuiNetwork(network: SuiNetworkName) {
    return this.withChainId(getSuiChainId(network));
  }

  build() {
    if (!this.chainId) {
      throw new Error("Network not set");
    }

    const suiNetwork = getSuiNetworkName(this.chainId);

    return this.makeMultiExecutor((url) => makeSuiGraphQLClient(suiNetwork, url), {
      query: MultiExecutor.ExecutionMode.AGREEMENT,
    });
  }
}
