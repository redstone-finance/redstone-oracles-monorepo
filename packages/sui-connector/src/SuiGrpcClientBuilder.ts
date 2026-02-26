import { SuiGraphQLClient } from "@mysten/sui/graphql";
import { getJsonRpcFullnodeUrl } from "@mysten/sui/jsonRpc";
import { ChainTypeEnum, MultiExecutor, RedstoneCommon } from "@redstone-finance/utils";
import { SuiNetworkName } from "./config";
import { GrpcSuiClient } from "./GrpcSuiClient";
import { getSuiChainId, getSuiNetworkName } from "./network-ids";
import { SuiClient } from "./SuiClient";
import { makeSuiClient, makeSuiGraphQLClient } from "./util";

export class SuiGrpcClientBuilder extends MultiExecutor.ClientBuilder<SuiClient> {
  protected override chainType = ChainTypeEnum.enum.sui;

  private readonly graphQlBuilder: SuiGraphQLClientBuilder;

  constructor() {
    super();

    this.graphQlBuilder = new SuiGraphQLClientBuilder();
  }

  withSuiNetwork(network: SuiNetworkName) {
    this.graphQlBuilder.withSuiNetwork(network);

    return this.withChainId(getSuiChainId(network));
  }

  withFullnodeUrl() {
    if (!this.chainId) {
      throw new Error("Network not set");
    }

    return this.withRpcUrl(getJsonRpcFullnodeUrl(getSuiNetworkName(this.chainId)));
  }

  withGraphqlUrls(urls: string[]) {
    this.graphQlBuilder.withRpcUrls(urls);

    return this;
  }

  build(): SuiClient {
    if (!this.chainId) {
      throw new Error("Network not set");
    }

    const suiNetwork = getSuiNetworkName(this.chainId);

    if (!this.urls.length) {
      this.urls.push(getJsonRpcFullnodeUrl(suiNetwork));
    }

    const grpcClient = this.makeMultiExecutor((url) => makeSuiClient(suiNetwork, url), {
      signAndExecuteTransaction: MultiExecutor.ExecutionMode.RACE,
      executeTransaction: MultiExecutor.ExecutionMode.RACE,
      getReferenceGasPrice: MultiExecutor.ExecutionMode.AGREEMENT,
      getBalance: MultiExecutor.ExecutionMode.AGREEMENT,
      waitForTransaction: MultiExecutor.ExecutionMode.AGREEMENT,
      ledgerService: {
        getCheckpoint: SuiGrpcClientBuilder.blockNumberConsensusExecutor,
      },
      core: {
        getBalance: MultiExecutor.ExecutionMode.AGREEMENT,
        waitForTransaction: MultiExecutor.ExecutionMode.AGREEMENT,
        getTransaction: MultiExecutor.ExecutionMode.AGREEMENT,
        getObject: MultiExecutor.ExecutionMode.AGREEMENT,
        getObjects: MultiExecutor.ExecutionMode.AGREEMENT,
        listCoins: MultiExecutor.ExecutionMode.AGREEMENT,
        listDynamicFields: MultiExecutor.ExecutionMode.AGREEMENT,
        getChainIdentifier: MultiExecutor.ExecutionMode.AGREEMENT,
        signAndExecuteTransaction: MultiExecutor.ExecutionMode.RACE,
      },
    });

    const graphqlClient = this.graphQlBuilder.build();

    return new GrpcSuiClient(grpcClient, graphqlClient);
  }

  async buildAndVerify() {
    if (!this.chainId) {
      throw new Error("Network not set");
    }

    const client = this.build();
    const chainId = await client.getChainIdentifier();

    RedstoneCommon.assert(Number(BigInt("0x" + chainId)) === this.chainId, "Wrong chainId");

    return client;
  }
}

class SuiGraphQLClientBuilder extends MultiExecutor.ClientBuilder<SuiGraphQLClient | undefined> {
  protected override chainType = ChainTypeEnum.enum.sui;

  withSuiNetwork(network: SuiNetworkName) {
    return this.withChainId(getSuiChainId(network));
  }

  build() {
    if (!this.chainId) {
      return undefined;
    }

    if (this.urls.length === 0) {
      return undefined;
    }

    const suiNetwork = getSuiNetworkName(this.chainId);

    return this.makeMultiExecutor((url) => makeSuiGraphQLClient(suiNetwork, url), {
      query: MultiExecutor.ExecutionMode.AGREEMENT,
    });
  }
}
