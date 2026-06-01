import { Aptos, AptosConfig } from "@aptos-labs/ts-sdk";
import { ChainType, ChainTypeEnum, MultiExecutor, RedstoneCommon } from "@redstone-finance/utils";
import { API_TYPE_INDEXER, MoveApi } from "./MoveApi";
import { MoveClient } from "./MoveClient";
import {
  AptosAndMovementNetwork,
  chainIdToNetwork,
  chainIdtoUrl,
  networkToChainId,
} from "./network-ids";

export abstract class MoveClientBuilder extends MultiExecutor.ClientBuilder<MoveClient> {
  static getInstance(chainType: Extract<ChainType, "movement" | "aptos">) {
    switch (chainType) {
      case ChainTypeEnum.enum.aptos:
        return new AptosClientBuilder();
      case ChainTypeEnum.enum.movement:
        return new MovementClientBuilder();
      default:
        return RedstoneCommon.throwUnsupportedParamError(chainType);
    }
  }

  build() {
    if (!this.chainId) {
      throw new Error("Network not set");
    }

    const network = chainIdToNetwork(this.chainId);
    const indexerApi = this.getIndexerApi();
    const indexerConfig = indexerApi?.apiKey
      ? { HEADERS: { Authorization: `Bearer ${indexerApi.apiKey}` } }
      : undefined;

    if (!this.getEligibleUrls().length) {
      this.urls.push(chainIdtoUrl(this.chainId));
    }

    return this.makeMultiExecutor(
      (url) =>
        new MoveClient(
          new Aptos(
            new AptosConfig({
              network,
              fullnode: MoveApi.parseUrl(url).baseUrl,
              indexer: indexerApi?.baseUrl,
              indexerConfig,
            })
          )
        ),
      {
        sendSimpleTransaction: MultiExecutor.ExecutionMode.RACE,
        waitForTransaction: MultiExecutor.ExecutionMode.AGREEMENT,
        getSequenceNumber: MultiExecutor.ExecutionMode.AGREEMENT,
        getBlockNumber: MultiExecutor.ClientBuilder.blockNumberConsensusExecutor,
        getGasPriceEstimation: MultiExecutor.ExecutionMode.AGREEMENT,
        getBalance: MultiExecutor.ExecutionMode.AGREEMENT,
        viewOnChain: MultiExecutor.ExecutionMode.AGREEMENT,
      }
    );
  }

  withNetwork(network: AptosAndMovementNetwork) {
    return this.withChainId(networkToChainId(network));
  }

  protected override getEligibleUrls() {
    return this.urls.filter((url) => MoveApi.parseUrl(url).type !== API_TYPE_INDEXER);
  }

  private getIndexerApi() {
    return this.urls
      .map((url) => MoveApi.parseUrl(url))
      .find((api) => api.type === API_TYPE_INDEXER);
  }
}

class AptosClientBuilder extends MoveClientBuilder {
  protected override chainType = ChainTypeEnum.enum.aptos;
}

class MovementClientBuilder extends MoveClientBuilder {
  protected override chainType = ChainTypeEnum.enum.movement;
}
