import { Value, ValueKind } from "@radixdlt/radix-engine-toolkit";
import { BigNumber } from "ethers";
import { RadixParser } from "../src/radix/parser/RadixParser";

export type ExtractedValue<K extends ValueKind> = Extract<Value, { kind: K }>;

export function expectToBe<K extends ValueKind>(
  obj: Value,
  kind: K
): asserts obj is Extract<Value, { kind: K }> {
  expect(obj.kind).toBe(kind);
}

export function expectElementKindToBe<K extends ValueKind>(
  elements: Value[],
  type: K
): asserts elements is ExtractedValue<K>[] {
  elements.map((element) => expectToBe(element, type));
}

export function expectTupleOfBigIntAndArray<K extends ValueKind>(
  obj: Value,
  bigintValue: bigint,
  type: K
) {
  expectToBe(obj, ValueKind.Tuple);

  expect(obj.fields.length).toBe(2);
  expectValue(obj.fields[0], ValueKind.U64, bigintValue);

  return expectArray<K>(obj.fields[1], type);
}

export function expectTupleOfBigIntAndTwoInts(
  obj: Value,
  bigintValue: bigint,
  v1: bigint,
  v2: bigint
) {
  expectToBe(obj, ValueKind.Tuple);

  expect(obj.fields.length).toBe(3);
  expectU256Digits(obj.fields[0], bigintValue);
  expectValue(obj.fields[1], ValueKind.U64, v1);
  expectValue(obj.fields[2], ValueKind.U64, v2);
}

export function expectValue<T>(
  value: Value,
  type: ValueKind,
  expectedValue: T
) {
  expectToBe(value, type);
  expect(value).toStrictEqual({ kind: type, value: expectedValue });
  expect(RadixParser.extractValue(value)).toBe(expectedValue);
}

export function expectU256Digits(value: Value, expectedValue: bigint) {
  const arr = expectArray(value, ValueKind.U64);

  expect(arr).toStrictEqual(u256Digits(expectedValue));
  expect(RadixParser.extractValue(value)).toStrictEqual(
    BigNumber.from(expectedValue)
  );
}

export function expectArray<K extends ValueKind>(value: Value, type: K) {
  expectToBe(value, ValueKind.Array);
  expectElementKindToBe(value.elements, type);

  return value.elements;
}

export function u256Digits(value: bigint) {
  return [
    { kind: ValueKind.U64, value },
    { kind: ValueKind.U64, value: 0n },
    { kind: ValueKind.U64, value: 0n },
    {
      kind: ValueKind.U64,
      value: 0n,
    },
  ] as ExtractedValue<ValueKind.U64>[];
}
