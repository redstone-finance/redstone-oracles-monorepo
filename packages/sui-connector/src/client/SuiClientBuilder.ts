import { getJsonRpcFullnodeUrl } from "@mysten/sui/jsonRpc";
import { ChainTypeEnum, MultiExecutor, RedstoneCommon } from "@redstone-finance/utils";
import { SuiNetworkName } from "../config";
import { getSuiChainId, getSuiNetworkName } from "../network-ids";
import { GRAPHQL_URL, makeSuiClient, makeSuiGraphQLClient, makeSuiJsonRpcClient } from "../util";
import { GrpcSuiClient } from "./GrpcSuiClient";
import { LegacySuiClient } from "./LegacySuiClient";
import { API_TYPE_GRAPHQL, API_TYPE_GRPC, SuiApi } from "./SuiApi";
import { SUB_INSTANCE_MODES, SuiClient } from "./SuiClient";

export class SuiClientBuilder extends MultiExecutor.ClientBuilder<SuiClient> {
  protected override chainType = ChainTypeEnum.enum.sui;

  withSuiNetwork(network: SuiNetworkName) {
    return this.withChainId(getSuiChainId(network));
  }

  withFullnodeUrl() {
    return this.withRpcUrl(getJsonRpcFullnodeUrl(this.requireSuiNetwork()));
  }

  override build() {
    this.ensureUrls();

    const suiNetwork = this.requireSuiNetwork();
    const graphqlClient = this.buildGraphqlClient(suiNetwork);

    return this.makeMultiExecutor<SuiClient>(
      (url) => {
        const api = SuiApi.parseUrl(url);
        if (api.type === API_TYPE_GRPC) {
          return new GrpcSuiClient(
            makeSuiClient(suiNetwork, api.baseUrl, api.token),
            graphqlClient
          );
        }

        return new LegacySuiClient(makeSuiJsonRpcClient(suiNetwork, api.baseUrl));
      },
      {
        getBlockNumber: new MultiExecutor.CeilMedianConsensusExecutor(
          MultiExecutor.DEFAULT_CONFIG.consensusQuorumRatio,
          MultiExecutor.BLOCK_NUMBER_EXECUTION_TIMEOUT_MS * 2
        ),
        getChainIdentifier: MultiExecutor.ExecutionMode.CONSENSUS_ALL_EQUAL,
        signAndExecute: MultiExecutor.ExecutionMode.RACE,
        getReferenceGasPrice: MultiExecutor.ExecutionMode.AGREEMENT,
        getBalance: MultiExecutor.ExecutionMode.AGREEMENT,
        waitForTransaction: MultiExecutor.ExecutionMode.AGREEMENT,
        listCoins: MultiExecutor.ExecutionMode.AGREEMENT,
        getObjects: MultiExecutor.ExecutionMode.AGREEMENT,
        getObject: MultiExecutor.ExecutionMode.AGREEMENT,
        listDynamicFields: MultiExecutor.ExecutionMode.AGREEMENT,
        getDynamicFieldValue: MultiExecutor.ExecutionMode.AGREEMENT,
        getReceivedCoinObjectIds: MultiExecutor.ExecutionMode.AGREEMENT,
        getTimeForBlock: MultiExecutor.ExecutionMode.AGREEMENT,
        txLookup: { fetchPage: MultiExecutor.ExecutionMode.FALLBACK },
        clientWithCoreApi: { core: SUB_INSTANCE_MODES.core },
      }
    );
  }

  async buildAndVerify() {
    const client = this.build();
    const chainId = await client.getChainIdentifier();
    RedstoneCommon.assert(Number(BigInt("0x" + chainId)) === this.chainId, "Wrong chainId");

    return client;
  }

  protected override getEligibleUrls() {
    return this.urls.filter((url) => SuiApi.parseUrl(url).type !== API_TYPE_GRAPHQL);
  }

  protected requireSuiNetwork() {
    if (!this.chainId) {
      throw new Error("Network not set");
    }

    return getSuiNetworkName(this.chainId);
  }

  protected ensureUrls() {
    const nonGraphql = this.getEligibleUrls();

    if (!nonGraphql.length) {
      this.withFullnodeUrl();
    }
  }

  private buildGraphqlClient(suiNetwork: SuiNetworkName) {
    const graphqlApis = RedstoneCommon.splitUrls(this.urls, (urlString) =>
      SuiApi.parseUrl(urlString)
    )[API_TYPE_GRAPHQL];
    const urls = graphqlApis?.map((api) => api.baseUrl) ?? [];

    if (!urls.length) {
      urls.push(GRAPHQL_URL[suiNetwork]);
    }

    return MultiExecutor.create(
      urls.map((url) => makeSuiGraphQLClient(suiNetwork, url)),
      { query: MultiExecutor.ExecutionMode.FALLBACK }
    );
  }
}
