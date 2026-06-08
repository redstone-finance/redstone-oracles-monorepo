import { Contract, xdr } from "@stellar/stellar-sdk";
import { IStellarCallerDelegate, StellarInvocation } from "../../src";

export const TEST_CONTRACT_ID = "CBM4TX2P6JAKDJ3RJEYZUXDQVGMYRFX5KGW2XMVHTZ4E3RF7D54F3TMD";
export const RPC_URL = "http://localhost";
export const QUICK_FLUSH_MS = 5;
export const NEVER_FIRES_WITHIN_TEST_MS = 1000;
export const MAX_NUMBER_OF_CALLS = 16;

export function makeBaseInvocation(method: string, argValue = 1): StellarInvocation {
  return {
    contract: new Contract(TEST_CONTRACT_ID),
    method,
    args: [xdr.ScVal.scvU32(argValue)],
  };
}

export class FakeDelegate implements IStellarCallerDelegate {
  waitForBlockNumberCalls: (number | undefined)[] = [];
  simulateInvocationCalls: { method: string; block?: number }[] = [];

  // eslint-disable-next-line @typescript-eslint/require-await -- mirrors interface
  async waitForBlockNumber(blockNumber?: number) {
    this.waitForBlockNumberCalls.push(blockNumber);
  }

  simulateInvocation<T>(
    invocation: StellarInvocation,
    blockNumber?: number,
    transform: (retVal: unknown) => T = (v) => v as T
  ): Promise<T> {
    this.simulateInvocationCalls.push({ method: invocation.method, block: blockNumber });

    return Promise.resolve(transform(`delegate:${invocation.method}@${blockNumber ?? "latest"}`));
  }
}
