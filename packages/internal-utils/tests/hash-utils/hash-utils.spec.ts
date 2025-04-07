import * as path from "path";
import {
  calculateCombinedHash,
  calculateDirectoryHash,
  calculateFileHash,
} from "../../src/hash-utils";

describe("hash-utils", () => {
  describe("calculateFileHash", () => {
    it("should calculate the correct SHA256 hash for bybit-config.json matching", () => {
      const filePath = path.resolve(__dirname, "test-config.json");
      const hash =
        "6ee7a6e8f58eeb1f7e29899611be04c1dfcf3f298458380079c0fe1a37a0acbc";

      const calculatedHash = calculateFileHash(filePath);
      expect(calculatedHash).toBe(hash);
    });
  });

  describe("calculateDirectoryHash", () => {
    it("should calculate a directory hash", () => {
      const testDirectoryPath = path.resolve(__dirname, "./config");

      const hashesForFilesInDir = [
        "3d3467cb193958433f4ecf9981f85314a5c37988cffefcbe0dfed5fa7ed90691",
        "f1bc320216e28becf1510214fef32809c1d956dc93d345b14919bed3aef6647b",
        "dced45b7837452502dbaed8ceb568f825881a18c1e5f3a8cb512eb826c97b408",
        "e0c863f4614e814089a230b011b64818f23302a9f8c22eaa0cda29045ba13f9e",
        "9163460132add64c420a9ed36e2f35d0bbb429d72c619d0d1dae78701268b686",
      ];

      const calculatedDirHash = calculateDirectoryHash(testDirectoryPath);
      const expectedCombinedHash = calculateCombinedHash(hashesForFilesInDir);
      expect(calculatedDirHash).toBe(expectedCombinedHash);
    });
  });
});
