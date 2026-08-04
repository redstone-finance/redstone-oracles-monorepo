import {
  DataPackage,
  NumericDataPoint,
  SignedDataPackage,
} from "@redstone-finance/protocol";
import { RedstoneCommon } from "@redstone-finance/utils";

const TEST_PRIVATE_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const TEST_SIGNER_ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
const TEST_TIMESTAMP = 1730000000000;
const TEST_VALUE = 42;
const TEST_MULTIBYTE_TEXT = "ETH/żółw";

export function assertEncodingWorksWithoutBuffer() {
  assertEqual("hexlify", RedstoneCommon.hexlify([1, 2, 255]), "0x0102ff");
  assertEqual(
    "arrayify",
    RedstoneCommon.hexlify(RedstoneCommon.arrayify("0x0102ff")),
    "0x0102ff"
  );
  assertEqual(
    "utf8",
    RedstoneCommon.toUtf8String(RedstoneCommon.toUtf8Bytes(TEST_MULTIBYTE_TEXT)),
    TEST_MULTIBYTE_TEXT
  );
  assertEqual(
    "bytes32String",
    RedstoneCommon.parseBytes32String(
      RedstoneCommon.formatBytes32String("ETH")
    ),
    "ETH"
  );
  assertEqual(
    "base64 signature round trip",
    recoverSignerOfRoundTrippedPackage(),
    TEST_SIGNER_ADDRESS
  );
}

function recoverSignerOfRoundTrippedPackage() {
  const dataPackage = new DataPackage(
    [new NumericDataPoint({ dataFeedId: "ETH", value: TEST_VALUE })],
    TEST_TIMESTAMP,
    "ETH"
  );
  const signed = dataPackage.sign(TEST_PRIVATE_KEY);

  return SignedDataPackage.fromObj(signed.toObj()).recoverSignerAddress();
}

function assertEqual(name, actual, expected) {
  if (actual !== expected) {
    throw new Error(`${name}: expected ${expected}, got ${actual}`);
  }
  console.log(`${name}: ${actual}`);
}
