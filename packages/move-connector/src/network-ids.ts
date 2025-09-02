import { Network } from "@aptos-labs/ts-sdk";
import _ from "lodash";

export enum AptosAndMovementNetwork {
  APTOS_MAINNET = "aptos-mainnet",
  APTOS_TESTNET = "aptos-testnet",
  APTOS_DEVNET = "aptos-devnet",

  MOVEMENT_MAINNET = "movement-mainnet",
  MOVEMENT_TESTNET = "movement-testnet",
  MOVEMENT_DEVNET = "movement-devnet",

  CUSTOM = "custom",
  LOCAL = "local",
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

export function networkToChainId(network: AptosAndMovementNetwork) {
  return Number(_.findKey(NETWORK_ID, (v) => v === network)!);
}

export function chainIdToNetwork(chainId: number): Network {
  switch (chainId) {
    case 1:
    case 126:
      return Network.MAINNET;
    case 2:
      return Network.TESTNET;
    case 250:
    default:
      return Network.CUSTOM;
  }
}
