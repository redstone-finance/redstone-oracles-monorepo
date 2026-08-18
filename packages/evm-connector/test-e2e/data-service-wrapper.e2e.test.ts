import { consts } from "@redstone-finance/protocol";
import { getSignersForDataServiceId } from "@redstone-finance/sdk";
import { RedstoneCommon } from "@redstone-finance/utils";
import { expect } from "chai";
import { ethers } from "hardhat";
import { WrapperBuilder } from "../src/index";

describe("DataServiceWrapper against a real authenticated gateway", () => {
  it("fetches real data packages and builds a valid RedStone payload", async () => {
    const contract = new ethers.Contract(ethers.constants.AddressZero, [
      "function updateDataFeedsValues(uint256 dataPackagesTimestamp) external",
    ]);

    const wrappedContract = WrapperBuilder.wrap(contract).usingDataService({
      dataServiceId: "redstone-primary-prod",
      uniqueSignersCount: 3,
      dataPackagesIds: ["ETH"],
      authorizedSigners: getSignersForDataServiceId("redstone-primary-prod"),
      authenticatedGateways: RedstoneCommon.getRequiredAuthenticatedGatewaysFromEnv(),
    });

    const tx = await wrappedContract.populateTransaction.updateDataFeedsValues(0);

    expect(tx.data).to.be.a("string");
    expect(tx.data).to.satisfy((data: string) =>
      data.endsWith(consts.REDSTONE_MARKER_HEX.replace("0x", ""))
    );
  });
});
