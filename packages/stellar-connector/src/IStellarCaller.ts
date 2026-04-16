import { Contract, xdr } from "@stellar/stellar-sdk";

export interface IStellarCaller {
  call<T>(
    invocation: StellarInvocation,
    blockNumber?: number,
    transform?: (retVal: unknown) => T
  ): Promise<T>;
}

export type StellarInvocation = { contract: Contract; method: string; args?: xdr.ScVal[] };
