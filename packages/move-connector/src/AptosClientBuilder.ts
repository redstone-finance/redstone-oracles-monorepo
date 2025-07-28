import { Aptos, AptosConfig } from "@aptos-labs/ts-sdk";
import { ChainTypeEnum, MultiExecutor } from "@redstone-finance/utils";
import { chainIdToNetwork, chainIdtoUrl } from "./network-ids";

export const SINGLE_EXECUTION_TIMEOUT_MS = 12_000;
export const ALL_EXECUTIONS_TIMEOUT_MS = 30_000;

abstract class BaseClientBuilder extends MultiExecutor.ClientBuilder<Aptos> {
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
        singleExecutionTimeoutMs: SINGLE_EXECUTION_TIMEOUT_MS,
        allExecutionsTimeoutMs: ALL_EXECUTIONS_TIMEOUT_MS,
      }
    );
  }
}

export class AptosClientBuilder extends BaseClientBuilder {
  protected override chainType = ChainTypeEnum.Enum.aptos;
}

export class MovementClientBuilder extends BaseClientBuilder {
  protected override chainType = ChainTypeEnum.Enum.movement;
}
