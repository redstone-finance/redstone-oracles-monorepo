import { TypeTagSerializer } from "@mysten/sui/bcs";
import { deriveDynamicFieldID } from "@mysten/sui/utils";
import { makeFeedIdBytes, makeSuiClient, makeSuiGraphQLClient, uint8ArrayToBcs } from "../src";
import { GrpcSuiClient, MISSING_FIELD_MESSAGE } from "../src/client/GrpcSuiClient";
import { ADAPTER_OBJECT_ID, FEED_ID, NETWORK, OTHER_ADDRESS, PAYLOAD_BYTES } from "./fixtures";

const FEED_ID_TYPE = "vector<u8>";
const FIELD_NAME = {
  type: FEED_ID_TYPE,
  bcs: uint8ArrayToBcs(makeFeedIdBytes(FEED_ID)).toBytes(),
};
const UNRELATED_ERROR = "Deprecated method";

describe("GrpcSuiClient", () => {
  let sut: GrpcSuiClient;
  let getDynamicFieldValue: jest.SpyInstance;

  beforeEach(() => {
    sut = new GrpcSuiClient(makeSuiClient(NETWORK), makeSuiGraphQLClient(NETWORK));
    getDynamicFieldValue = jest.spyOn(sut.objects, "getDynamicFieldValue");
  });

  describe("getDynamicFieldValues", () => {
    it("should give back the value of a field that is there", async () => {
      getDynamicFieldValue.mockResolvedValue({ dynamicField: { value: { bcs: PAYLOAD_BYTES } } });

      await expect(sut.getDynamicFieldValues(ADAPTER_OBJECT_ID, [FIELD_NAME])).resolves.toEqual([
        PAYLOAD_BYTES,
      ]);
    });

    it("should read no value when the missing object is the derived field id", async () => {
      getDynamicFieldValue.mockRejectedValue(new Error(`Object ${derivedFieldId()} not found`));

      await expect(sut.getDynamicFieldValues(ADAPTER_OBJECT_ID, [FIELD_NAME])).resolves.toEqual([
        undefined,
      ]);
    });

    it("should read no value whatever wording the node puts around the field id", async () => {
      getDynamicFieldValue.mockRejectedValue(
        new Error(`object ${derivedFieldId()} was not found on this node`)
      );

      await expect(sut.getDynamicFieldValues(ADAPTER_OBJECT_ID, [FIELD_NAME])).resolves.toEqual([
        undefined,
      ]);
    });

    it("should read no value when the thrown object is not an Error instance", async () => {
      getDynamicFieldValue.mockRejectedValue({ message: MISSING_FIELD_MESSAGE });

      await expect(sut.getDynamicFieldValues(ADAPTER_OBJECT_ID, [FIELD_NAME])).resolves.toEqual([
        undefined,
      ]);
    });

    it("should rethrow a read that failed with nothing thrown along", async () => {
      getDynamicFieldValue.mockRejectedValue(undefined);

      await expect(sut.getDynamicFieldValues(ADAPTER_OBJECT_ID, [FIELD_NAME])).rejects.toEqual(
        undefined
      );
    });

    it("should throw when another object is the missing one", async () => {
      getDynamicFieldValue.mockRejectedValue(new Error(`Object ${OTHER_ADDRESS} not found`));

      await expect(sut.getDynamicFieldValues(ADAPTER_OBJECT_ID, [FIELD_NAME])).rejects.toThrow(
        OTHER_ADDRESS
      );
    });

    it("should throw when the read failed for any other reason", async () => {
      getDynamicFieldValue.mockRejectedValue(new Error(UNRELATED_ERROR));

      await expect(sut.getDynamicFieldValues(ADAPTER_OBJECT_ID, [FIELD_NAME])).rejects.toThrow(
        UNRELATED_ERROR
      );
    });

    function derivedFieldId() {
      return deriveDynamicFieldID(
        ADAPTER_OBJECT_ID,
        TypeTagSerializer.parseFromStr(FEED_ID_TYPE),
        FIELD_NAME.bcs
      );
    }
  });
});
