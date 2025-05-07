import {
  SkippableRustSdkError,
  SolanaRustSdkErrroHandler,
} from "../src/price_adapter/SolanaRustSdkErrorHandler";

function makeInstructionError(code: number) {
  return {
    InstructionError: [
      0,
      {
        Custom: code,
      },
    ],
  };
}

function makeBadInstructionError() {
  return {
    InstructionErrorer: [
      0,
      {
        Customer: 10,
      },
    ],
  };
}

describe("SolanaRustSdkErrorHandler tests", () => {
  it("Handles unknown errors", () => {
    const unknownErrors = [0, 1, 2, 3, 4].map(makeInstructionError);

    for (const unknownError of unknownErrors) {
      expect(SolanaRustSdkErrroHandler.canSkipError(unknownError)).toBeFalsy();
    }
  });
  it("Handles known errors", () => {
    const unknownErrors = Object.values(SkippableRustSdkError)
      .filter((error) => typeof error === "number")
      .map(makeInstructionError);

    for (const unknownError of unknownErrors) {
      expect(SolanaRustSdkErrroHandler.canSkipError(unknownError)).toBeTruthy();
    }
  });
  it("Handles badly formatted error", () => {
    expect(
      SolanaRustSdkErrroHandler.canSkipError(makeBadInstructionError())
    ).toBeFalsy();
  });
});
