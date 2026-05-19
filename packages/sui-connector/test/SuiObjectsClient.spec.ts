import { SuiObjectsClient } from "../src";
import {
  ALT_INCLUDE_A,
  ALT_INCLUDE_B,
  arrayOfIds,
  DEFAULT_INCLUDE,
  DYNAMIC_FIELD_INCLUDE,
  DYNAMIC_FIELD_NAME_TYPE,
  FakeCore,
  makeFakeObject,
  makeFieldObject,
  makeParentId,
  OVERFLOW_BATCH_COUNT,
  SUI_MULTI_GET_OBJECTS_MAX,
} from "./test-helpers";

describe("SuiObjectsClient", () => {
  let sut: SuiObjectsClient;
  let core: FakeCore;

  beforeEach(() => {
    core = new FakeCore();
    sut = new SuiObjectsClient(core);
  });

  describe("getObjects include parameterization", () => {
    it("uses the default include when no override is passed", async () => {
      core.populate(["a"]);

      await sut.getObjects(["a"]);

      expect(core.calls[0].include).toEqual(DEFAULT_INCLUDE);
    });

    it("passes a custom include through to core.getObjects", async () => {
      core.populate(["a"]);

      await sut.getObjects(["a"], ALT_INCLUDE_A);

      expect(core.calls[0].include).toEqual(ALT_INCLUDE_A);
    });

    it("uses separate collectors per include shape", async () => {
      core.populate(["a", "b"]);

      await Promise.all([
        sut.getObjects(["a"], ALT_INCLUDE_A),
        sut.getObjects(["b"], ALT_INCLUDE_B),
      ]);

      expect(core.calls).toHaveLength(2);
      const includes = new Set(core.calls.map((c) => JSON.stringify(c.include)));
      expect(includes.size).toBe(2);
    });

    it("reuses one collector for repeated calls with the same include", async () => {
      core.populate(["a", "b"]);

      await Promise.all([
        sut.getObjects(["a"], ALT_INCLUDE_A),
        sut.getObjects(["b"], ALT_INCLUDE_A),
      ]);

      expect(core.calls).toHaveLength(1);
      expect(core.calls[0].objectIds.sort()).toEqual(["a", "b"]);
    });

    it("throws when an objectId is missing (Error sentinel from core)", async () => {
      await expect(sut.getObjects(["missing"])).rejects.toThrow("missing");
    });

    it("chunks end-to-end through the proxy at the Sui multiGetObjects limit", async () => {
      const ids = core.populate(arrayOfIds("o", OVERFLOW_BATCH_COUNT));

      const result = await sut.getObjects(ids);

      expect(result).toHaveLength(OVERFLOW_BATCH_COUNT);
      expect(core.calls.length).toBeGreaterThanOrEqual(2);
      for (const call of core.calls) {
        expect(call.objectIds.length).toBeLessThanOrEqual(SUI_MULTI_GET_OBJECTS_MAX);
      }
    });

    it("forwards undefined include unchanged when caller calls core.getObjects directly", async () => {
      core.populate(["a"]);

      await sut.core.getObjects({ objectIds: ["a"] });

      expect(core.calls).toHaveLength(1);
      expect(core.calls[0].include).toBeUndefined();
    });

    it("keeps a separate collector bucket for undefined include vs explicit include", async () => {
      core.populate(["a", "b"]);

      await Promise.all([sut.core.getObjects({ objectIds: ["a"] }), sut.getObjects(["b"])]);

      expect(core.calls).toHaveLength(2);
      const includes = core.calls.map((c) => c.include);
      expect(includes).toContainEqual(undefined);
      expect(includes).toContainEqual(DEFAULT_INCLUDE);
    });
  });

  describe("getObject", () => {
    it("returns the single resolved object", async () => {
      core.populate(["a"]);

      const result = await sut.getObject("a");

      expect(result).toEqual(makeFakeObject("a"));
    });
  });

  describe("getDynamicFieldValue", () => {
    it("routes through getObjects with the dynamic-field include", async () => {
      const parentId = makeParentId(1);
      const { object, nameBcs } = makeFieldObject(parentId, 7n, 42n);
      core.results.set(object.objectId, object);

      await sut.getDynamicFieldValue(parentId, { type: DYNAMIC_FIELD_NAME_TYPE, bcs: nameBcs });

      expect(core.calls).toHaveLength(1);
      expect(core.calls[0].include).toEqual(DYNAMIC_FIELD_INCLUDE);
      expect(core.calls[0].objectIds).toEqual([object.objectId]);
    });

    it("parses the field object into the GetDynamicFieldResult shape", async () => {
      const parentId = makeParentId(2);
      const { object, nameBcs, valuePayload } = makeFieldObject(parentId, 11n, 99n);
      core.results.set(object.objectId, object);

      const result = await sut.getDynamicFieldValue(parentId, {
        type: DYNAMIC_FIELD_NAME_TYPE,
        bcs: nameBcs,
      });

      expect(result.dynamicField.fieldId).toBe(object.objectId);
      expect(result.dynamicField.name.bcs).toEqual(nameBcs);
      expect(result.dynamicField.value.bcs).toEqual(valuePayload);
    });

    it("does not share its collector with the default getObjects collector", async () => {
      const parentId = makeParentId(3);
      const { object, nameBcs } = makeFieldObject(parentId, 13n, 17n);
      core.results.set(object.objectId, object);
      core.populate(["plain"]);

      await Promise.all([
        sut.getObjects(["plain"]),
        sut.getDynamicFieldValue(parentId, { type: DYNAMIC_FIELD_NAME_TYPE, bcs: nameBcs }),
      ]);

      expect(core.calls).toHaveLength(2);
      const includes = core.calls.map((c) => c.include);
      expect(includes).toContainEqual(DEFAULT_INCLUDE);
      expect(includes).toContainEqual(DYNAMIC_FIELD_INCLUDE);
    });
  });

  describe("dispose", () => {
    it("clears the underlying collectors map (next call creates a fresh one)", async () => {
      core.populate(["a"]);

      await sut.getObjects(["a"]);
      sut.dispose();
      await sut.getObjects(["a"]);

      expect(core.calls).toHaveLength(2);
    });
  });
});
