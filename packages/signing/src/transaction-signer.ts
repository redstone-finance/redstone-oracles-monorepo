import type { TransactionRequest } from "@ethersproject/abstract-provider";
import { Wallet as EthersWallet } from "@ethersproject/wallet";

export function signTransaction(transaction: TransactionRequest, privateKey: string) {
  return new EthersWallet(privateKey).signTransaction(transaction);
}
