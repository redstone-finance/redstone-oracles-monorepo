import { ChainTypeEnum, MultiExecutor } from "@redstone-finance/utils";
import { CantonClient } from "./CantonClient";
import { chainIdToNetwork, networkToChainId } from "./CantonNetwork";

import { KeycloakTokenProviderParams } from "./KeycloakTokenProviderParams";
import { keycloakTokenProvider } from "./keycloak-token-provider";

type TokenProvider = () => Promise<string>;

export class CantonClientBuilder extends MultiExecutor.ClientBuilder<CantonClient> {
  protected override chainType = ChainTypeEnum.enum.canton;
  private partyId?: string;
  private tokenProvider?: TokenProvider;

  withPartyId(partyId: string) {
    this.partyId = partyId;
    return this;
  }

  withTokenProvider(provider?: TokenProvider) {
    this.tokenProvider = provider;
    return this;
  }

  withDefaultAuth(opts?: KeycloakTokenProviderParams | string) {
    return this.chainId !== networkToChainId("localnet") ? this.withKeycloakAuth(opts) : this;
  }

  withKeycloakAuth(opts?: KeycloakTokenProviderParams | string) {
    return this.withTokenProvider(() => keycloakTokenProvider(opts));
  }

  build() {
    if (this.urls.length !== 1) {
      throw new Error("Only single URL is required");
    }
    if (!this.chainId) {
      throw new Error("chainId is required");
    }
    if (!this.partyId) {
      throw new Error("partyId is required");
    }

    const network = chainIdToNetwork(this.chainId);

    return new CantonClient(this.partyId, this.urls[0], network, this.tokenProvider);
  }
}
