import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
import { MultiExecutor } from "@redstone-finance/utils";
import { chainIdtoMovementNetwork, getFullnodeUrl } from "./network-ids";

export const SINGLE_EXECUTION_TIMEOUT_MS = 12_000;
export const ALL_EXECUTIONS_TIMEOUT_MS = 30_000;

export class AptosClientBuilder {
  private urls: string[] = [];
  private network?: Network;

  private static makeMultiExecutor(
    clients: Aptos[],
    config = {
      singleExecutionTimeoutMs: SINGLE_EXECUTION_TIMEOUT_MS,
      allExecutionsTimeoutMs: ALL_EXECUTIONS_TIMEOUT_MS,
    }
  ) {
    return MultiExecutor.create(
      clients,
      {
        transaction: {
          signAndSubmitTransaction: MultiExecutor.ExecutionMode.RACE,
          waitForTransaction: MultiExecutor.ExecutionMode.RACE,
        },
        getAccountInfo: MultiExecutor.ExecutionMode.AGREEMENT,
        getAccountAPTAmount: MultiExecutor.ExecutionMode.AGREEMENT,
      },
      { ...MultiExecutor.DEFAULT_CONFIG, ...config }
    );
  }

  public withChainId(id: number) {
    this.network = chainIdtoMovementNetwork(id);

    return this;
  }

  public withRpcUrls(urls: string[]) {
    this.urls.push(...urls);

    return this;
  }

  public build() {
    if (!this.network) {
      throw new Error("Network not set");
    }

    if (!this.urls.length) {
      this.urls.push(getFullnodeUrl(this.network));
    }

    // As per https://docs.movementnetwork.xyz/devs/interactonchain/tsSdk#configuration we set network to CUSTOM one.
    this.network = Network.CUSTOM;

    const clients = this.urls.map(
      (url) =>
        new Aptos(
          new AptosConfig({
            network: this.network,
            fullnode: url,
          })
        )
    );

    if (clients.length === 1) {
      return clients[0];
    }

    return AptosClientBuilder.makeMultiExecutor(clients);
  }
}
