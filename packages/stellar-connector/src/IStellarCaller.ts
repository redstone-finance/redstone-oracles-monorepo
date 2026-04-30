import { Contract, xdr } from "@stellar/stellar-sdk";

export interface IStellarCallerDelegate {
  waitForBlockNumber(blockNumber?: number): Promise<void>;
  simulateInvocation<T>(
    invocation: StellarInvocation,
    blockNumber?: number,
    transform?: (retVal: unknown) => T
  ): Promise<T>;
}

export interface IStellarCaller {
  delegateClient?: WeakRef<IStellarCallerDelegate>;
  call<T>(
    invocation: StellarInvocation,
    blockNumber?: number,
    transform?: (retVal: unknown) => T
  ): Promise<T>;
}

export type StellarInvocation = { contract: Contract; method: string; args?: xdr.ScVal[] };
