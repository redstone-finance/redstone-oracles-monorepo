import { ChainTypeEnum, MultiExecutor, RedstoneCommon } from "@redstone-finance/utils";
import { RadixApiClient } from "./RadixApiClient";
import { RadixClient } from "./RadixClient";
import { DEFAULT_RADIX_CLIENT_CONFIG, RadixClientConfig } from "./RadixClientConfig";
import { RadixSigner } from "./RadixSigner";

export class RadixClientBuilder extends MultiExecutor.ClientBuilder<
  RadixClient,
  string | undefined
> {
  protected override chainType = ChainTypeEnum.enum.radix;

  private privateKey?: RedstoneCommon.PrivateKey;
  private clientConfig = DEFAULT_RADIX_CLIENT_CONFIG;

  withPrivateKey(privateKey?: RedstoneCommon.PrivateKey) {
    this.privateKey = privateKey;

    return this;
  }

  withClientConfig(config: RadixClientConfig) {
    this.clientConfig = config;

    return this;
  }

  build() {
    if (!this.chainId) {
      throw new Error("NetworkId not set");
    }

    if (!this.urls.length) {
      this.urls.push(undefined);
    }

    const apiClient = this.makeMultiExecutor((url) => new RadixApiClient(this.chainId, url), {
      getCurrentStateVersion: RadixClientBuilder.blockNumberConsensusExecutor,
      getCurrentEpochNumber: RadixClientBuilder.blockNumberConsensusExecutor,
      submitTransaction: MultiExecutor.ExecutionMode.RACE,
      getTransactionStatus: MultiExecutor.ExecutionMode.AGREEMENT,
      getFungibleBalance: MultiExecutor.ExecutionMode.AGREEMENT,
      getNonFungibleBalance: MultiExecutor.ExecutionMode.AGREEMENT,
      getStateFields: MultiExecutor.ExecutionMode.AGREEMENT,
    });

    const signer = this.privateKey ? new RadixSigner(this.privateKey) : undefined;

    return new RadixClient(apiClient, this.chainId, signer, this.clientConfig);
  }
}
