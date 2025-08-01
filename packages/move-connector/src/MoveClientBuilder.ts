import { Aptos, AptosConfig } from "@aptos-labs/ts-sdk";
import {
  ChainType,
  ChainTypeEnum,
  MultiExecutor,
  RedstoneCommon,
} from "@redstone-finance/utils";
import { chainIdToNetwork, chainIdtoUrl } from "./network-ids";

export abstract class MoveClientBuilder extends MultiExecutor.ClientBuilder<Aptos> {
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
      (fullnode) =>
        new Aptos(
          new AptosConfig({
            network,
            fullnode,
          })
        ),
      {
        transaction: {
          signAndSubmitTransaction: MultiExecutor.ExecutionMode.RACE,
          waitForTransaction: MultiExecutor.ExecutionMode.RACE,
        },
        getAccountInfo: MultiExecutor.ExecutionMode.AGREEMENT,
        getAccountAPTAmount: MultiExecutor.ExecutionMode.AGREEMENT,
      },
      {
        singleExecutionTimeoutMs: MultiExecutor.SINGLE_EXECUTION_TIMEOUT_MS,
        allExecutionsTimeoutMs: MultiExecutor.ALL_EXECUTIONS_TIMEOUT_MS,
      }
    );
  }
}

class AptosClientBuilder extends MoveClientBuilder {
  protected override chainType = ChainTypeEnum.Enum.aptos;
}

class MovementClientBuilder extends MoveClientBuilder {
  protected override chainType = ChainTypeEnum.Enum.movement;
}
