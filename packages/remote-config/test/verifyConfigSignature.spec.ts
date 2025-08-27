import { readFileSync } from "fs";
import { ConfigUpdater } from "../src/ConfigUpdater";

describe("ConfigUpdater", () => {
  it("should properly verify signature", () => {
    const file = readFileSync("./test/example_signature.txt", "utf8");
    const signerAddress = ConfigUpdater.extractSignerAddress(
      file,
      "f478d334ba08c08bb800a8c5b101d149d554bc5426a42278ebed5e25cbc4367d"
    );
    expect(signerAddress).toEqual("0xFA58c20f839549f9C06081B0b7b0Be38Cec45B83");
  });
});
