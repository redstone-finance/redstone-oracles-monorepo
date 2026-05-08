import { ChainTypeEnum, MultiExecutor } from "@redstone-finance/utils";
import { chainIdToNetwork, networkToChainId } from "../CantonNetwork";
import { CantonClient } from "./CantonClient";
import { TokenProvider } from "./CantonScanApiClient";
import { KeycloakTokenProvider } from "./keycloak-token-provider";
import { KeycloakTokenProviderParams, makeKeycloakParams } from "./KeycloakTokenProviderParams";

export class CantonClientBuilder extends MultiExecutor.ClientBuilder<CantonClient> {
  protected override chainType = ChainTypeEnum.enum.canton;
  private tokenProvider?: TokenProvider;
  private scanApiTokenProvider?: TokenProvider;

  withTokenProvider(provider?: TokenProvider) {
    this.tokenProvider = provider;
    this.scanApiTokenProvider = undefined;

    return this;
  }

  withDefaultAuth(opts?: KeycloakTokenProviderParams | string) {
    return this.chainId !== networkToChainId("localnet") ? this.withKeycloakAuth(opts) : this;
  }

  withKeycloakAuth(opts?: KeycloakTokenProviderParams | string) {
    const parsedOpts = makeKeycloakParams(opts);

    const ledgerClientId = parsedOpts.walletClientId ?? parsedOpts.clientId;
    const ledgerProvider = KeycloakTokenProvider.getInstance({
      ...parsedOpts,
      clientId: ledgerClientId,
    });
    const scanProvider = KeycloakTokenProvider.getInstance(parsedOpts);

    this.tokenProvider = ledgerProvider.getToken.bind(ledgerProvider);
    this.scanApiTokenProvider = scanProvider.getToken.bind(scanProvider);

    return this;
  }

  build() {
    if (this.urls.length !== 1) {
      throw new Error("Only single URL is required");
    }
    if (!this.chainId) {
      throw new Error("chainId is required");
    }

    return new CantonClient(
      this.urls[0],
      chainIdToNetwork(this.chainId),
      this.tokenProvider,
      this.scanApiTokenProvider
    );
  }
}
