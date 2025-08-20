import { HttpClient } from "@redstone-finance/http-client";
import { RedstoneCommon } from "@redstone-finance/utils";
import { providers } from "ethers";
import { z } from "zod";
import {
  ProviderWithAgreement,
  ProviderWithAgreementConfig,
} from "./providers/ProviderWithAgreement";
import { ProviderWithFallback } from "./providers/ProviderWithFallback";
import {
  RedstoneEthers5Provider,
  RedstoneProvider,
} from "./providers/RedstoneProvider";

type MegaProviderOptions = {
  rpcUrls: readonly string[];
  network: { name: string; chainId: number };
  throttleLimit: number;
  timeout: number;
  pollingInterval?: number;
  httpClient?: HttpClient;
};

type ProviderFactory = () => providers.Provider;

type Decorator = (factory: ProviderFactory) => ProviderFactory;

export class MegaProviderBuilder {
  private factories: ProviderFactory[];

  constructor(private readonly options: MegaProviderOptions) {
    this.factories = this.buildProvidersFactories();
  }

  addDecorator(decorator: Decorator, addIf = true) {
    if (addIf) {
      this.factories = this.factories.map(decorator);
    }
    return this;
  }

  agreement(opts: ProviderWithAgreementConfig, addIf = true) {
    if (addIf) {
      const agreementProvider = new ProviderWithAgreement(
        this.factories.map((f) => f()),
        opts
      );
      this.factories = [() => agreementProvider];
    }
    return this;
  }

  fallback(opts: ProviderWithAgreementConfig, addIf = true) {
    if (addIf) {
      const fallbackProvider = new ProviderWithFallback(
        this.factories.map((f) => f()),
        opts
      );
      this.factories = [() => fallbackProvider];
    }
    return this;
  }

  build<T extends providers.Provider>() {
    RedstoneCommon.assert(
      this.factories.length === 1,
      `MegaProviderBuilder should always return a single provider. Please use agreement or fallback option. Options used ${JSON.stringify(this.options)}`
    );

    return this.factories[0]() as T;
  }

  private buildProvidersFactories(): ProviderFactory[] {
    const useRedstoneProvider = RedstoneCommon.getFromEnv(
      "USE_REDSTONE_PROVIDER",
      z.boolean().default(false)
    );

    return this.options.rpcUrls.map((rpcUrl) => () => {
      if (useRedstoneProvider) {
        RedstoneCommon.assert(
          this.options.httpClient,
          "You have to provide httpClient to MegeProviderBuilder when USE_REDSTONE_PROVIDER is set",
          true
        );
        const redstoneProvider = new RedstoneProvider(
          this.options.httpClient,
          rpcUrl
        );
        const provider = new RedstoneEthers5Provider(
          redstoneProvider,
          this.options.network
        );
        return provider;
      } else {
        const provider = new providers.StaticJsonRpcProvider(
          {
            url: rpcUrl,
            timeout: this.options.timeout,
            throttleLimit: this.options.throttleLimit,
            throttleCallback: () => Promise.resolve(false), // blocks ethersJs retries on 429 responses - caused memory leak due to long retry-again in RPC (hypeRPC) api rate limit exceeded response
          },
          this.options.network
        );
        if (this.options.pollingInterval) {
          provider.pollingInterval = this.options.pollingInterval;
        }
        return provider;
      }
    });
  }
}
