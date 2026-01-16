import { ChainTypeEnum, MultiExecutor, RedstoneCommon } from "@redstone-finance/utils";
import { Horizon, rpc } from "@stellar/stellar-sdk";
import { HorizonClient } from "./HorizonClient";
import { StellarClient } from "./StellarClient";
import { getStellarChainId, StellarNetwork } from "./network-ids";

export class StellarClientBuilder extends MultiExecutor.ClientBuilder<StellarClient> {
  protected override chainType = ChainTypeEnum.enum.stellar;
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

    const horizon = RedstoneCommon.isDefined(this.horizonUrl)
      ? new HorizonClient(new Horizon.Server(this.horizonUrl, { allowHttp: true }))
      : undefined;

    return this.makeMultiExecutor(
      (url) => new StellarClient(new rpc.Server(url, { allowHttp: true }), horizon),
      {
        getBlockNumber: StellarClientBuilder.blockNumberConsensusExecutor,
        sendTransaction: MultiExecutor.ExecutionMode.RACE,
        simulateOperation: MultiExecutor.ExecutionMode.AGREEMENT,
        getAccountBalance: MultiExecutor.ExecutionMode.AGREEMENT,
        getContractData: MultiExecutor.ExecutionMode.AGREEMENT,
        getTransaction: MultiExecutor.ExecutionMode.AGREEMENT,
        waitForTx: MultiExecutor.ExecutionMode.AGREEMENT,
        getInstanceTtl: MultiExecutor.ExecutionMode.AGREEMENT,
      }
    );
  }
}
