import { Interface } from "@ethersproject/abi";
import { BigNumber, BigNumberish } from "@ethersproject/bignumber";
import { RedstoneCommon } from "@redstone-finance/utils";
import { expect } from "chai";

export type AbiHolder = { interface: Interface };

export async function expectCustomError(
  contract: AbiHolder,
  errorName: string,
  action: () => Promise<unknown>,
  expectedArgs?: unknown[]
) {
  try {
    await action();
  } catch (error) {
    const { name, args } = parseCustomError(contract, error);
    expect(name).to.equal(errorName);
    if (RedstoneCommon.isDefined(expectedArgs)) {
      expect(args.map(String)).to.deep.equal(expectedArgs.map(String));
    }

    return;
  }

  expect.fail(`Expected the call to revert with ${errorName}`);
}

export async function expectRevert(action: () => Promise<unknown>) {
  try {
    await action();
  } catch {
    return;
  }

  expect.fail("Expected the call to revert");
}

export function expectNumber(actual: BigNumberish, expected: BigNumberish, message?: string) {
  expect(BigNumber.from(actual).toString()).to.equal(BigNumber.from(expected).toString(), message);
}

function parseCustomError(contract: AbiHolder, error: unknown) {
  const data = revertBytes(error);
  RedstoneCommon.assert(
    RedstoneCommon.isDefined(data),
    `Reverted without any data: ${String(error)}`
  );
  const { name, args } = contract.interface.parseError(data);

  return { name, args: Array.from(args) as unknown[] };
}

function revertBytes(error: unknown): string | undefined {
  const { data, error: innerError } = (error ?? {}) as { data?: unknown; error?: unknown };
  if (typeof data === "string") {
    return data;
  }

  return RedstoneCommon.isDefined(innerError) ? revertBytes(innerError) : undefined;
}
