import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import { ChainTypeEnum, MultiExecutor, RedstoneCommon } from "@redstone-finance/utils";
import { SuiNetworkName } from "./config";
import { getSuiChainId, getSuiNetworkName } from "./network-ids";
import { makeSuiClient } from "./util";

export class SuiClientBuilder extends MultiExecutor.ClientBuilder<SuiClient> {
  protected override chainType = ChainTypeEnum.Enum.sui;

  withSuiNetwork(network: SuiNetworkName) {
    return this.withChainId(getSuiChainId(network));
  }

  withFullnodeUrl() {
    if (!this.chainId) {
      throw new Error("Network not set");
    }

    const suiNetwork = getSuiNetworkName(this.chainId);

    return this.withRpcUrl(getFullnodeUrl(suiNetwork));
  }

  build() {
    if (!this.chainId) {
      throw new Error("Network not set");
    }

    const suiNetwork = getSuiNetworkName(this.chainId);

    if (!this.urls.length) {
      this.urls.push(getFullnodeUrl(suiNetwork));
    }

    return this.makeMultiExecutor((url) => makeSuiClient(suiNetwork, url), {
      getChainIdentifier: MultiExecutor.ExecutionMode.CONSENSUS_ALL_EQUAL,
      signAndExecuteTransaction: MultiExecutor.ExecutionMode.RACE,
      executeTransactionBlock: MultiExecutor.ExecutionMode.RACE,
      getLatestCheckpointSequenceNumber: SuiClientBuilder.blockNumberConsensusExecutor,
      getReferenceGasPrice: MultiExecutor.ExecutionMode.AGREEMENT,
      getBalance: MultiExecutor.ExecutionMode.AGREEMENT,
      waitForTransaction: MultiExecutor.ExecutionMode.AGREEMENT,
      getTransactionBlock: MultiExecutor.ExecutionMode.AGREEMENT,
    });
  }

  async buildAndVerify() {
    const megaClient = this.build();
    const chainId = await megaClient.getChainIdentifier();

    RedstoneCommon.assert(Number(BigInt("0x" + chainId)) === this.chainId, "Wrong chainId");

    return megaClient;
  }
}
