import { Aptos, AptosConfig } from "@aptos-labs/ts-sdk";
import {
  ChainType,
  ChainTypeEnum,
  MultiExecutor,
  RedstoneCommon,
} from "@redstone-finance/utils";
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
      case ChainTypeEnum.Enum.aptos:
        return new AptosClientBuilder();
      case ChainTypeEnum.Enum.movement:
        return new MovementClientBuilder();
      default:
        return RedstoneCommon.throwUnsupportedParamError(chainType);
    }
  }

  build() {
    if (!this.chainId) {
      throw new Error("Network not set");
    }

    if (!this.urls.length) {
      this.urls.push(chainIdtoUrl(this.chainId));
    }

    const network = chainIdToNetwork(this.chainId);

    return this.makeMultiExecutor(
      (url) =>
        new MoveClient(
          new Aptos(
            new AptosConfig({
              network,
              fullnode: url,
            })
          )
        ),
      {
        sendSimpleTransaction: MultiExecutor.ExecutionMode.RACE,
        waitForTransaction: MultiExecutor.ExecutionMode.AGREEMENT,
        getSequenceNumber: MultiExecutor.ExecutionMode.AGREEMENT,
        getBlockNumber:
          MultiExecutor.ClientBuilder.blockNumberConsensusExecutor,
        getGasPriceEstimation: MultiExecutor.ExecutionMode.AGREEMENT,
        getBalance: MultiExecutor.ExecutionMode.AGREEMENT,
        viewOnChain: MultiExecutor.ExecutionMode.AGREEMENT,
      }
    );
  }

  withNetwork(network: AptosAndMovementNetwork) {
    return this.withChainId(networkToChainId(network));
  }
}

class AptosClientBuilder extends MoveClientBuilder {
  protected override chainType = ChainTypeEnum.Enum.aptos;
}

class MovementClientBuilder extends MoveClientBuilder {
  protected override chainType = ChainTypeEnum.Enum.movement;
}
