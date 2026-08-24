import { parse } from "@ethersproject/transactions";

export interface ParsedTransaction {
  hash?: string;
  from?: string;
  to?: string;
  nonce: number;
  chainId: number;
  type: number | null;
  data: string;
  value: bigint;
  gasLimit: bigint;
  gasPrice?: bigint;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
}

export function parseSignedTransaction(rawTransaction: string): ParsedTransaction {
  const tx = parse(rawTransaction);

  return {
    hash: tx.hash,
    from: tx.from,
    to: tx.to,
    nonce: tx.nonce,
    chainId: tx.chainId,
    type: tx.type ?? null,
    data: tx.data,
    value: tx.value.toBigInt(),
    gasLimit: tx.gasLimit.toBigInt(),
    gasPrice: tx.gasPrice?.toBigInt(),
    maxFeePerGas: tx.maxFeePerGas?.toBigInt(),
    maxPriorityFeePerGas: tx.maxPriorityFeePerGas?.toBigInt(),
  };
}
