import { Nested, PullModelTestCase } from "../types";
import { corruptedPayloadTestCases } from "./corruptedPayloadTestCases";
import { dataPackagesTestCases } from "./dataPackagesTestCases";
import { dataTimestampTestCases } from "./dataTimestampTestCases";
import { signaturesTestCases } from "./signaturesTestCases";

const pullModelTestCases: Record<string, Nested<PullModelTestCase>> = {
  "Data timestamp": dataTimestampTestCases,
  "Data packages": dataPackagesTestCases,
  "Signatures tests": signaturesTestCases,
  "Corrupted payload": corruptedPayloadTestCases,
};

export default pullModelTestCases;
