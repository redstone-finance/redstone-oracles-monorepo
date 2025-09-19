import { Nested, PullModelTestCase } from "../types";
import { corruptedPayloadTestCases } from "./corruptedPayloadTestCases";
import { dataPackagesTestCases, nonEvmAdditionalTests } from "./dataPackagesTestCases";
import { dataTimestampTestCases } from "./dataTimestampTestCases";
import { signaturesTestCases } from "./signaturesTestCases";

const pullModelTestCases: Record<string, Nested<PullModelTestCase>> = {
  "Data timestamp": dataTimestampTestCases,
  "Data packages": dataPackagesTestCases,
  "Data packages non evm": nonEvmAdditionalTests,
  "Signatures tests": signaturesTestCases,
  "Corrupted payload": corruptedPayloadTestCases,
};

export default pullModelTestCases;
