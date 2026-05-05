import { getCommitmentOrConfigKey } from "../src/GetAccountsInfoRequestCollector";

describe("getCommitmentOrConfigKey", () => {
  describe("empty / undefined", () => {
    it("should return empty string for undefined", () => {
      expect(getCommitmentOrConfigKey(undefined)).toBe("");
    });

    it("should return empty string for an empty config object", () => {
      expect(getCommitmentOrConfigKey({})).toBe("");
    });
  });

  describe("commitment only", () => {
    it("should return the commitment string as-is", () => {
      expect(getCommitmentOrConfigKey("confirmed")).toBe("confirmed");
      expect(getCommitmentOrConfigKey("finalized")).toBe("finalized");
      expect(getCommitmentOrConfigKey("processed")).toBe("processed");
    });

    it("should return the commitment for a config with only commitment", () => {
      expect(getCommitmentOrConfigKey({ commitment: "confirmed" })).toBe("confirmed");
      expect(getCommitmentOrConfigKey({ commitment: "finalized" })).toBe("finalized");
    });

    it("should canonicalize string commitment and { commitment } to the same key", () => {
      expect(getCommitmentOrConfigKey("confirmed")).toBe(
        getCommitmentOrConfigKey({ commitment: "confirmed" })
      );
      expect(getCommitmentOrConfigKey("finalized")).toBe(
        getCommitmentOrConfigKey({ commitment: "finalized" })
      );
    });
  });

  describe("minContextSlot", () => {
    it("should append minContextSlot after commitment", () => {
      expect(getCommitmentOrConfigKey({ commitment: "confirmed", minContextSlot: 5 })).toBe(
        "confirmed#5"
      );
    });

    it("should keep an empty commitment slot when minContextSlot is set without commitment", () => {
      expect(getCommitmentOrConfigKey({ minContextSlot: 5 })).toBe("#5");
    });

    it("should produce different keys for different minContextSlot values", () => {
      expect(getCommitmentOrConfigKey({ commitment: "confirmed", minContextSlot: 1 })).toBe(
        "confirmed#1"
      );
      expect(getCommitmentOrConfigKey({ commitment: "confirmed", minContextSlot: 2 })).toBe(
        "confirmed#2"
      );
    });
  });

  describe("dataSlice", () => {
    it("should append dataSlice length and offset after commitment and minContextSlot slots", () => {
      expect(getCommitmentOrConfigKey({ dataSlice: { offset: 4, length: 32 } })).toBe("##32#4");
    });

    it("should append dataSlice after commitment", () => {
      expect(
        getCommitmentOrConfigKey({
          commitment: "confirmed",
          dataSlice: { offset: 4, length: 32 },
        })
      ).toBe("confirmed##32#4");
    });

    it("should produce different keys for different dataSlice offsets", () => {
      expect(getCommitmentOrConfigKey({ dataSlice: { offset: 0, length: 32 } })).toBe("##32#0");
      expect(getCommitmentOrConfigKey({ dataSlice: { offset: 4, length: 32 } })).toBe("##32#4");
    });

    it("should produce different keys for different dataSlice lengths", () => {
      expect(getCommitmentOrConfigKey({ dataSlice: { offset: 0, length: 16 } })).toBe("##16#0");
      expect(getCommitmentOrConfigKey({ dataSlice: { offset: 0, length: 32 } })).toBe("##32#0");
    });
  });

  describe("all fields combined (cumulative key)", () => {
    it("should join all parts in order: commitment#minContextSlot#dataSlice.length#dataSlice.offset", () => {
      expect(
        getCommitmentOrConfigKey({
          commitment: "confirmed",
          minContextSlot: 5,
          dataSlice: { offset: 4, length: 32 },
        })
      ).toBe("confirmed#5#32#4");
    });
  });
});
