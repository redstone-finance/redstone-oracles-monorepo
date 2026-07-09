import { assertThenReturnOrFail, stringifyError } from "../../src/common";

describe("stringifyError", () => {
  it("returns string errors unchanged", () => {
    const message = "Could not confirm transaction abc for BTC";

    expect(stringifyError(message)).toBe(message);
  });

  it("is idempotent for already-stringified errors", () => {
    const once = stringifyError(new Error("boom"));

    expect(stringifyError(once)).toBe(once);
  });
});

describe("assertThenReturnOrFail", () => {
  it("should return the value when there are no errors", () => {
    const value = "test value";
    const result = assertThenReturnOrFail(value, [], "Test error message", true);
    expect(result).toBe(value);
  });

  it("should throw an AggregateError when there are errors and failOnError is true", () => {
    const errors = [new Error("First error"), new Error("Second error")];
    const errMsg = "Aggregate error message";

    expect(() => {
      assertThenReturnOrFail("test value", errors, errMsg, true);
    }).toThrow(AggregateError);

    try {
      assertThenReturnOrFail("test value", errors, errMsg, true);
    } catch (error) {
      expect(error).toBeInstanceOf(AggregateError);
      expect((error as AggregateError).message).toBe(errMsg);
      expect((error as AggregateError).errors).toEqual(errors);
    }
  });

  it("should return the value when there are errors and failOnError is false", () => {
    const errors = [new Error("First error")];
    const errMsg = "Aggregate error message";

    const result = assertThenReturnOrFail("test value", errors, errMsg, false);

    expect(result).toBe("test value");
  });
});
