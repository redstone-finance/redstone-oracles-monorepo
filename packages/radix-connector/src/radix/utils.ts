import { toUtf8Bytes } from "@ethersproject/strings/lib/utf8";
import {
  address,
  array,
  enumeration,
  hash,
  NetworkId,
  nonFungibleLocalId,
  RadixEngineToolkit,
  str,
  tuple,
  u8,
  Value,
  ValueKind,
} from "@radixdlt/radix-engine-toolkit";
import { arrayify } from "ethers/lib/utils";

export interface NonFungibleGlobalIdInput {
  resourceAddress: string;
  localId: string;
}

export function makeSetRoleArg(metadataName: string, newAccessRule: Value) {
  return [
    enumeration(0), // enum ModuleId::Main = 0,
    str(metadataName),
    newAccessRule,
  ];
}

export function makeOwnerUpdatableRole(accessRule: Value) {
  return enumeration(2, accessRule);
}

export function publicKeyHash(pk: string) {
  const pkHash = hash(Buffer.from(pk, "hex")).subarray(-29);
  return Buffer.from(pkHash).toString("hex");
}

export async function edResource(networkId: number) {
  const addressBook = await RadixEngineToolkit.Utils.knownAddresses(networkId);
  return addressBook.resourceAddresses.ed25519SignatureVirtualBadge;
}

export async function makeEdSignatureResource(pkHash: string, networkId: number) {
  return enumeration(
    0,
    makeNonFungibleGlobalId({
      resourceAddress: await edResource(networkId),
      localId: `[${pkHash}]`,
    })
  );
}

export async function makeMultisigAccessRule(
  threshold: number,
  publicKeys: string[],
  networkId: number = NetworkId.Stokenet
) {
  const pkHashes = publicKeys.map(publicKeyHash);

  const resources = [];
  for (const pkHash of pkHashes) {
    resources.push(await makeEdSignatureResource(pkHash, networkId));
  }

  return enumeration(
    2,
    enumeration(
      0,
      enumeration(
        2,
        {
          kind: ValueKind.U8,
          value: threshold,
        },
        array(ValueKind.Enum, ...resources)
      )
    )
  );
}

export function makeNonFungibleGlobalId(input: NonFungibleGlobalIdInput) {
  return tuple(address(input.resourceAddress), nonFungibleLocalId(input.localId));
}

export function makeOption<T>(creator: (arg0: T) => Value, valueOrUndefined?: T) {
  return enumeration(
    valueOrUndefined ? 1 : 0,
    ...(valueOrUndefined ? [creator(valueOrUndefined)] : [])
  );
}

export function makeBytes(arr: number[]) {
  return array(ValueKind.U8, ...arr.map(u8));
}

export function makeFeedId(feedId: string) {
  const feedIdArr = Array.from(toUtf8Bytes(feedId));

  return makeBytes(feedIdArr);
}

export function makeFeedIds(arr: string[]) {
  return array(ValueKind.Array, ...arr.map(makeFeedId));
}

export function makeSigners(arr: string[]) {
  const signerArrays = arr.map((signer) => Array.from(arrayify(signer)));

  return array(ValueKind.Array, ...signerArrays.map(makeBytes));
}
