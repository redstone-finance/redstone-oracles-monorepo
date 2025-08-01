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

    const server = new rpc.Server(this.urls[0], { allowHttp: true });

    return new StellarRpcClient(server);
  }
}
