import { RedstoneCommon } from "@redstone-finance/utils";
import { CLU256, CLU8, CLValue, CLValueBuilder } from "casper-js-sdk";
import { CLList } from "casper-js-sdk/dist/lib/CLValue/List";

export type CasperNumber = CLU256["data"];

export function encodeByteCLList(param: string) {
  const bytes = Array.from(RedstoneCommon.arrayify(param));
  const u8List = bytes.map(CLValueBuilder.u8);

  return CLValueBuilder.list(u8List);
}

export function encodeCLU256(value: string) {
  return CLValueBuilder.u256(RedstoneCommon.arrayify(value));
}

export function decodeValue<T>(value: unknown) {
  return (value as CLValue).value() as T;
}

export function decodeNumber(value: unknown) {
  return decodeValue<CasperNumber>(value).toNumber();
}

export function decodeCLList<T extends CLValue, U>(list: CLList<T>): U[] {
  return list.value().map((v: T) => {
    return v.value() as U;
  });
}

export function decodeStringCLList(list: unknown): string[] {
  return (list as CLList<CLU256>)
    .value()
    .map((x) => RedstoneCommon.toUtf8String(x.value().toHexString()));
}

export function decodeHex(bytes: unknown) {
  const byteList: CasperNumber[] = decodeCLList(bytes as CLList<CLU8>);

  return RedstoneCommon.hexlify(byteList.map((v) => v.toNumber())).substring(2);
}
