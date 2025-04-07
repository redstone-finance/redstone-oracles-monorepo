import { RadixApiClient } from "./RadixApiClient";
import { RadixClient } from "./RadixClient";
import {
  DEFAULT_RADIX_CLIENT_CONFIG,
  RadixClientConfig,
} from "./RadixClientConfig";
import { RadixPrivateKey, RadixSigner } from "./RadixSigner";

export class RadixClientBuilder {
  private urls: string[] = [];
  private networkId?: number;
  private privateKey?: RadixPrivateKey;
  private clientConfig = DEFAULT_RADIX_CLIENT_CONFIG;

  withNetworkBasePath(basePath?: string) {
    return basePath ? this.withRpcUrl(basePath) : this;
  }

  withNetworkId(networkId: number) {
    this.networkId = networkId;

    return this;
  }

  withRpcUrl(url: string) {
    this.urls.push(url);

    return this;
  }

  withRpcUrls(urls: string[]) {
    this.urls.push(...urls);

    return this;
  }

  withPrivateKey(privateKey?: RadixPrivateKey) {
    this.privateKey = privateKey;

    return this;
  }

  withClientConfig(config: RadixClientConfig) {
    this.clientConfig = config;

    return this;
  }

  build() {
    if (!this.networkId) {
      throw new Error("Network not set");
    }

    const urls: (string | undefined)[] = this.urls.length
      ? this.urls
      : [undefined];
    const apiClient = RadixApiClient.makeMultiExecutor(urls, this.networkId);

    const signer = this.privateKey
      ? new RadixSigner(this.privateKey)
      : undefined;

    return new RadixClient(
      apiClient,
      this.networkId,
      signer,
      this.clientConfig
    );
  }
}
