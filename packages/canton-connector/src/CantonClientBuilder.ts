import { CantonClient } from "./CantonClient";
import { keycloakTokenProvider, readPartyId, readPartySuffix } from "./utils";

type TokenProvider = () => Promise<string>;

function chainIdToNetwork(chainId: number) {
  switch (chainId) {
    case 1:
      return "mainnet";
    case 2:
      return "devnet";
  }
  throw new Error(`Unknown chain-id #${chainId} for Canton. Only 1 or 2 are supported`);
}

export class CantonClientBuilder {
  private url?: string;
  private chainId?: number;
  private partyId?: string;
  private partySuffix?: string;
  private tokenProvider?: TokenProvider;

  withUrl(url: string) {
    this.url = url;
    return this;
  }

  withChainId(chainId: number) {
    this.chainId = chainId;
    return this;
  }

  withPartyId(partyId: string) {
    this.partyId = partyId;
    return this;
  }

  withPartySuffix(suffix: string) {
    this.partySuffix = suffix;
    return this;
  }

  withTokenProvider(provider: TokenProvider) {
    this.tokenProvider = provider;
    return this;
  }

  withKeycloakAuth(opts?: {
    url: string;
    realm: string;
    clientId: string;
    username: string;
    password: string;
  }) {
    this.tokenProvider = () => keycloakTokenProvider(opts);

    return this;
  }

  build(): CantonClient {
    if (!this.url) {
      throw new Error("URL is required");
    }
    if (!this.chainId) {
      throw new Error("Chain ID is required");
    }
    if (!this.partyId) {
      throw new Error("Party ID is required");
    }
    if (!this.partySuffix) {
      throw new Error("Party suffix is required");
    }
    if (!this.tokenProvider) {
      throw new Error("Token provider is required");
    }

    const fullPartyId = `${this.partyId}::${this.partySuffix}`;
    const network = chainIdToNetwork(this.chainId);

    return new CantonClient(fullPartyId, this.url, this.tokenProvider, network);
  }
}

export function makeCantonClients(url: string, chainId: number) {
  const { viewerPartyId, updaterPartyId } = readPartyId();
  const partySuffix = readPartySuffix();

  const [client, updateClient] = [viewerPartyId, updaterPartyId].map((partyId) =>
    new CantonClientBuilder()
      .withUrl(url)
      .withChainId(chainId)
      .withPartySuffix(partySuffix)
      .withPartyId(partyId)
      .withKeycloakAuth()
      .build()
  );

  return { client, updateClient };
}
