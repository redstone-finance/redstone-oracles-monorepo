enum Network {
  APTOS_MAINNET = "aptos-mainnet",
  APTOS_TESTNET = "aptos-testnet",

  MOVEMENT_MAINNET = "movement-mainnet",
  MOVEMENT_TESTNET = "movement-testnet",

  CUSTOM = "custom",
}

export const NETWORK_ID: { [p: number]: Network } = {
  1: Network.APTOS_MAINNET,
  2: Network.APTOS_TESTNET,
  126: Network.MOVEMENT_MAINNET,
  250: Network.MOVEMENT_TESTNET,
};

export function getFullnodeUrl(network: Network) {
  switch (network) {
    case Network.MOVEMENT_MAINNET:
      return "https://mainnet.movementnetwork.xyz/v1";
    case Network.MOVEMENT_TESTNET:
      return "https://aptos.testnet.bardock.movementlabs.xyz/v1";
    case Network.APTOS_MAINNET:
      return "https://api.mainnet.aptoslabs.com/v1";
    case Network.APTOS_TESTNET:
      return "https://api.testnet.aptoslabs.com/v1";
    default:
      throw new Error(`Network ${network} not supported`);
  }
}

export function chainIdtoMovementNetwork(chainId: number) {
  return NETWORK_ID[chainId] ?? Network.CUSTOM;
}
