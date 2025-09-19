import { ChainTypeEnum, MultiExecutor } from "@redstone-finance/utils";
import { Horizon, rpc } from "@stellar/stellar-sdk";
import { StellarRpcClient } from "./StellarRpcClient";
import { getStellarChainId, StellarNetwork } from "./network-ids";

const SINGLE_EXECUTION_TIMEOUT_MS = 11_000;

export class StellarClientBuilder extends MultiExecutor.ClientBuilder<StellarRpcClient> {
  protected override chainType = ChainTypeEnum.Enum.stellar;
  private horizonUrl?: string;

  withStellarNetwork(network: StellarNetwork) {
    return this.withChainId(getStellarChainId(network));
  }

  withHorizonUrl(horizonUrl?: string) {
    this.horizonUrl = horizonUrl;

    return this;
  }

  build() {
    if (!this.chainId) {
      throw new Error("Network not set");
    }

    const horizon =
      this.horizonUrl !== undefined
        ? new Horizon.Server(this.horizonUrl, { allowHttp: true })
        : undefined;

    return this.makeMultiExecutor(
      (url) => new StellarRpcClient(new rpc.Server(url, { allowHttp: true }), horizon),
      {
        getBlockNumber: StellarClientBuilder.blockNumberConsensusExecutor,
        executeOperation: MultiExecutor.ExecutionMode.RACE,
        simulateOperation: MultiExecutor.ExecutionMode.AGREEMENT,
        getAccountBalance: MultiExecutor.ExecutionMode.AGREEMENT,
        getContractData: MultiExecutor.ExecutionMode.AGREEMENT,
        waitForTx: MultiExecutor.ExecutionMode.AGREEMENT,
      },
      {
        singleExecutionTimeoutMs: SINGLE_EXECUTION_TIMEOUT_MS,
        allExecutionsTimeoutMs: MultiExecutor.ALL_EXECUTIONS_TIMEOUT_MS,
      }
    );
  }
}
