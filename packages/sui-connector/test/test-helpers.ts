import { bcs } from "@mysten/sui/bcs";
import { CoreClient, type SuiClientTypes } from "@mysten/sui/client";
import { deriveDynamicFieldID, SUI_ADDRESS_LENGTH } from "@mysten/sui/utils";

export const DEFAULT_INCLUDE = { json: true, content: true };
export const DYNAMIC_FIELD_INCLUDE = { previousTransaction: true, content: true };
export const CUSTOM_INCLUDE = { previousTransaction: true };

export const U64_BCS_BYTES = 8;
export const DEFAULT_FIELD_TYPE = "0x2::dynamic_field::Field<u64, u64>";
export const DYNAMIC_FIELD_NAME_TYPE = "u64";

export const SUI_MULTI_GET_OBJECTS_MAX = 50;
export const OVERFLOW_BATCH_COUNT = SUI_MULTI_GET_OBJECTS_MAX + 70;

export const ALT_INCLUDE_A = { json: true };
export const ALT_INCLUDE_B = { content: true };

export const QUICK_FLUSH_MS = 5;
export const SHORT_WINDOW_MS = 50;
export const NEVER_FIRES_WITHIN_TEST_MS = 1000;
export const SLOW_RPC_DELAY_MS = 100;
export const HALF_WINDOW_WAIT_MS = 60;

export type FakeObject = {
  objectId: string;
  digest: string;
  version: string;
  type: string;
  previousTransaction?: string;
  content: Uint8Array;
};

export function makeFakeObject(id: string, overrides?: Partial<FakeObject>): FakeObject {
  return {
    objectId: id,
    digest: `digest-${id}`,
    version: "1",
    type: DEFAULT_FIELD_TYPE,
    content: new Uint8Array(SUI_ADDRESS_LENGTH + U64_BCS_BYTES + U64_BCS_BYTES),
    ...overrides,
  };
}

class FakeCoreImpl {
  calls: { objectIds: string[]; include: SuiClientTypes.ObjectInclude | undefined }[] = [];
  results = new Map<string, FakeObject>();
  delay = 0;
  rejectNext?: Error;

  readonly core: unknown = this;
  readonly base: unknown = this;
  readonly network = "testnet" as const;
  readonly mvr = {
    resolveType: ({ type }: { type: string }) => Promise.resolve({ type }),
  };

  getObjects({
    objectIds,
    include,
  }: SuiClientTypes.GetObjectsOptions): Promise<SuiClientTypes.GetObjectsResponse> {
    this.calls.push({ objectIds: [...objectIds], include });

    if (this.rejectNext) {
      const err = this.rejectNext;
      this.rejectNext = undefined;

      return Promise.reject(err);
    }

    const objects = objectIds.map(
      (id) => this.results.get(id) ?? new Error(`unknown object ${id}`)
    ) as unknown as SuiClientTypes.GetObjectsResponse["objects"];

    if (this.delay > 0) {
      return new Promise((resolve) =>
        setTimeout(() => resolve({ objects: [...objects] }), this.delay)
      );
    }

    return Promise.resolve({ objects });
  }

  populate(ids: string[]) {
    ids.forEach((id) => this.results.set(id, makeFakeObject(id)));

    return ids;
  }
}

Object.setPrototypeOf(FakeCoreImpl.prototype, CoreClient.prototype);

export const FakeCore = FakeCoreImpl as unknown as new () => FakeCoreImpl & CoreClient;
export type FakeCore = FakeCoreImpl & CoreClient;

export function makeParentId(seed: number) {
  const hex = seed.toString(16).padStart(2, "0");

  return "0x" + hex.repeat(SUI_ADDRESS_LENGTH);
}

export function makeU64Bcs(value: bigint) {
  return bcs.u64().serialize(value).toBytes();
}

export function makeFieldObject(parentId: string, nameSeed: bigint, valueSeed: bigint) {
  const nameBcs = makeU64Bcs(nameSeed);
  const fieldId = deriveDynamicFieldID(parentId, DYNAMIC_FIELD_NAME_TYPE, nameBcs);
  const valuePayload = makeU64Bcs(valueSeed);
  const content = new Uint8Array(SUI_ADDRESS_LENGTH + nameBcs.length + valuePayload.length);
  content.set(valuePayload, SUI_ADDRESS_LENGTH + nameBcs.length);

  return {
    fieldId,
    nameBcs,
    valuePayload,
    object: makeFakeObject(fieldId, {
      type: `0x2::dynamic_field::Field<${DYNAMIC_FIELD_NAME_TYPE}, u64>`,
      content,
    }),
  };
}

export function arrayOfIds(prefix: string, count: number) {
  return Array.from({ length: count }, (_, i) => `${prefix}-${i}`);
}
