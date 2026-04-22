import { ChainTypeEnum, MultiExecutor, RedstoneCommon } from "@redstone-finance/utils";
import { Horizon, rpc } from "@stellar/stellar-sdk";
import { HorizonClient } from "./HorizonClient";
import { getStellarChainId, NETWORK_NAMES, StellarNetwork } from "./network-ids";
import { StellarClient } from "./StellarClient";
import { StellarMulticall } from "./StellarMulticall";

export class StellarClientBuilder extends MultiExecutor.ClientBuilder<StellarClient> {
  protected override chainType = ChainTypeEnum.enum.stellar;
  private horizonUrl?: string;
  private isWithMulticall = false;

  withStellarNetwork(network: StellarNetwork) {
    return this.withChainId(getStellarChainId(network));
  }

  withHorizonUrl(horizonUrl?: string) {
    this.horizonUrl = horizonUrl;

    return this;
  }

  withMulticall(withMulticall = true) {
    this.isWithMulticall = withMulticall;

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
      (url) =>
        new StellarClient(
          new rpc.Server(url, { allowHttp: true }),
          horizon,
          this.isWithMulticall
            ? StellarMulticall.instanceForUrl(url, NETWORK_NAMES[this.chainId!])
            : undefined
        ),
      {
        getBlockNumber: new MultiExecutor.CeilMedianConsensusExecutor(
          MultiExecutor.DEFAULT_CONFIG.consensusQuorumRatio,
          MultiExecutor.BLOCK_NUMBER_EXECUTION_TIMEOUT_MS * 2
        ),
        sendTransaction: MultiExecutor.ExecutionMode.RACE,
        simulateOperation: MultiExecutor.ExecutionMode.AGREEMENT,
        getAccountBalance: MultiExecutor.ExecutionMode.AGREEMENT,
        getContractEntries: MultiExecutor.ExecutionMode.MULTI_AGREEMENT,
        getTransaction: MultiExecutor.ExecutionMode.AGREEMENT,
        waitForTx: MultiExecutor.ExecutionMode.AGREEMENT,
        getInstanceTtl: MultiExecutor.ExecutionMode.AGREEMENT,
      }
    );
  }
}
