import { Network } from "@aptos-labs/ts-sdk";

enum AptosAndMovementNetwork {
  APTOS_MAINNET = "aptos-mainnet",
  APTOS_TESTNET = "aptos-testnet",

  MOVEMENT_MAINNET = "movement-mainnet",
  MOVEMENT_TESTNET = "movement-testnet",

  CUSTOM = "custom",
}

export const NETWORK_ID: { [p: number]: AptosAndMovementNetwork } = {
  1: AptosAndMovementNetwork.APTOS_MAINNET,
  2: AptosAndMovementNetwork.APTOS_TESTNET,
  126: AptosAndMovementNetwork.MOVEMENT_MAINNET,
  250: AptosAndMovementNetwork.MOVEMENT_TESTNET,
};

export function getFullnodeUrl(network: AptosAndMovementNetwork) {
  switch (network) {
    case AptosAndMovementNetwork.MOVEMENT_MAINNET:
      return "https://mainnet.movementnetwork.xyz/v1";
    case AptosAndMovementNetwork.MOVEMENT_TESTNET:
      return "https://aptos.testnet.bardock.movementlabs.xyz/v1";
    case AptosAndMovementNetwork.APTOS_MAINNET:
      return "https://api.mainnet.aptoslabs.com/v1";
    case AptosAndMovementNetwork.APTOS_TESTNET:
      return "https://api.testnet.aptoslabs.com/v1";
    default:
      throw new Error(`Network ${network} not supported`);
  }
}

export function chainIdtoUrl(chainId: number) {
  return NETWORK_ID[chainId] ?? Network.CUSTOM;
}

export function chainIdToNetwork(chainId: number): Network {
  switch (chainId) {
    case 1:
      return Network.MAINNET;
    case 2:
      return Network.TESTNET;
    default:
      return Network.CUSTOM;
  }
}
