import { BigNumberish } from "ethers";
import { Result } from "starknet";

export function getNumberFromStarknetResult(value: Result | BigNumberish) {
  return Number(value);
}

function getBigIntFromStarknetResult(value: Result | BigNumberish) {
  return BigInt(Number(value));
}

export function extractNumbers(response: Result): bigint[] {
  return (response as Result[]).map(getBigIntFromStarknetResult);
}
