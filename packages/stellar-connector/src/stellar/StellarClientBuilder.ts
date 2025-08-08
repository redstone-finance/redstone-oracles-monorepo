import { ChainTypeEnum, MultiExecutor } from "@redstone-finance/utils";
import { rpc } from "@stellar/stellar-sdk";
import { StellarRpcClient } from "./StellarRpcClient";
import { getStellarChainId, StellarNetwork } from "./network-ids";

export class StellarClientBuilder extends MultiExecutor.ClientBuilder<StellarRpcClient> {
  protected override chainType = ChainTypeEnum.Enum.stellar;

  withStellarNetwork(network: StellarNetwork) {
    return this.withChainId(getStellarChainId(network));
  }

  build() {
    if (!this.chainId) {
      throw new Error("Network not set");
    }

    return this.makeMultiExecutor(
      (url) => new StellarRpcClient(new rpc.Server(url, { allowHttp: true })),
      {
        getBlockNumber: StellarClientBuilder.blockNumberConsensusExecutor,
        executeOperation: MultiExecutor.ExecutionMode.RACE,
        simulateOperation: MultiExecutor.ExecutionMode.AGREEMENT,
        getAccountBalance: MultiExecutor.ExecutionMode.AGREEMENT,
        getContractData: MultiExecutor.ExecutionMode.AGREEMENT,
        waitForTx: MultiExecutor.ExecutionMode.AGREEMENT,
      }
    );
  }
}
