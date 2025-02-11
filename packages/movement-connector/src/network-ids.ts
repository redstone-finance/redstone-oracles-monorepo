import { Network } from "@aptos-labs/ts-sdk";

export const MOVEMENT_NETWORK_IDS: { [p: number]: Network } = {
  177: Network.TESTNET,
  126: Network.MAINNET,
};

export function getFullnodeUrl(network: Network) {
  switch (network) {
    case Network.MAINNET:
      return "https://mainnet.movementnetwork.xyz/v1";
    case Network.TESTNET:
      return "https://aptos.testnet.porto.movementlabs.xyz/v1";
    default:
      throw new Error(`Network ${network} not supported`);
  }
}

export function chainIdtoMovementNetwork(chainId: number) {
  return MOVEMENT_NETWORK_IDS[chainId] ?? Network.CUSTOM;
}
