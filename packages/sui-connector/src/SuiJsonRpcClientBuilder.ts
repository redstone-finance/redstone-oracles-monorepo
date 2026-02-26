import { getJsonRpcFullnodeUrl } from "@mysten/sui/jsonRpc";
import { ChainTypeEnum, MultiExecutor, RedstoneCommon } from "@redstone-finance/utils";
import { SuiNetworkName } from "./config";
import { LegacyJsonRpcClient } from "./LegacyClient";
import { getSuiChainId, getSuiNetworkName } from "./network-ids";
import { SuiClient } from "./SuiClient";
import { makeSuiJsonRpcClient } from "./util";

export class SuiJsonRpcClientBuilder extends MultiExecutor.ClientBuilder<SuiClient> {
  protected override chainType = ChainTypeEnum.enum.sui;

  withSuiNetwork(network: SuiNetworkName) {
    return this.withChainId(getSuiChainId(network));
  }

  withFullnodeUrl() {
    if (!this.chainId) {
      throw new Error("Network not set");
    }

    const suiNetwork = getSuiNetworkName(this.chainId);

    return this.withRpcUrl(getJsonRpcFullnodeUrl(suiNetwork));
  }

  build(): SuiClient {
    if (!this.chainId) {
      throw new Error("Network not set");
    }

    const suiNetwork = getSuiNetworkName(this.chainId);

    if (!this.urls.length) {
      this.urls.push(getJsonRpcFullnodeUrl(suiNetwork));
    }

    return this.makeMultiExecutor(
      (url) => new LegacyJsonRpcClient(makeSuiJsonRpcClient(suiNetwork, url)),
      {
        getChainIdentifier: MultiExecutor.ExecutionMode.CONSENSUS_ALL_EQUAL,
        signAndExecute: MultiExecutor.ExecutionMode.RACE,
        getReferenceGasPrice: MultiExecutor.ExecutionMode.AGREEMENT,
        getBalance: MultiExecutor.ExecutionMode.AGREEMENT,
        waitForTransaction: MultiExecutor.ExecutionMode.AGREEMENT,
        clientForParallelExecutor: {
          getBalance: MultiExecutor.ExecutionMode.AGREEMENT,
          waitForTransaction: MultiExecutor.ExecutionMode.AGREEMENT,
          getTransaction: MultiExecutor.ExecutionMode.AGREEMENT,
          getObject: MultiExecutor.ExecutionMode.AGREEMENT,
          getObjects: MultiExecutor.ExecutionMode.AGREEMENT,
          listCoins: MultiExecutor.ExecutionMode.AGREEMENT,
          listDynamicFields: MultiExecutor.ExecutionMode.AGREEMENT,
          getChainIdentifier: MultiExecutor.ExecutionMode.AGREEMENT,
          signAndExecuteTransaction: MultiExecutor.ExecutionMode.RACE,
        },
      }
    );
  }

  async buildAndVerify() {
    const megaClient = this.build();
    const chainId = await megaClient.getChainIdentifier();

    RedstoneCommon.assert(Number(BigInt("0x" + chainId)) === this.chainId, "Wrong chainId");

    return megaClient;
  }
}
