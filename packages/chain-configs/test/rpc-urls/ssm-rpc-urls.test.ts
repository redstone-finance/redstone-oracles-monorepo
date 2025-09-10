import { NetworkIdSchema, RedstoneCommon } from "@redstone-finance/utils";
import { readSsmRpcUrls } from "../../scripts/read-ssm-rpc-urls";
import { validateBlockNumberAgreementBetweenRpcs, validateNetworkRpcUrls } from "./common";

const networkId = RedstoneCommon.getFromEnv("NETWORK_ID", NetworkIdSchema.optional());
const blockNumberDiffTolerance = 5;

describe("SSM Main Rpc Urls Validation", function () {
  before(async function () {
    if (!process.env.TEST_RPC) {
      this.skip();
    }
    const rpcUrlsPerChain = await readSsmRpcUrls(false, networkId);
    validateNetworkRpcUrls(rpcUrlsPerChain);
    validateBlockNumberAgreementBetweenRpcs(rpcUrlsPerChain, blockNumberDiffTolerance);
  });
  it("force before hook to get executed", () => {});
});

describe("SSM Fallback Rpc Urls Validation", function () {
  before(async function () {
    if (!process.env.TEST_RPC) {
      this.skip();
    }
    const rpcUrlsPerChain = await readSsmRpcUrls(true, networkId);
    validateNetworkRpcUrls(rpcUrlsPerChain);
    validateBlockNumberAgreementBetweenRpcs(rpcUrlsPerChain, blockNumberDiffTolerance);
  });

  it("force before hook to get executed", () => {});
});
