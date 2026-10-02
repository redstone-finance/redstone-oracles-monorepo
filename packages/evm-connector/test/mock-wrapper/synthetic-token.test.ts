import { Signer } from "@ethersproject/abstract-signer";
import { utils } from "@redstone-finance/protocol";
import { RedstoneCommon } from "@redstone-finance/utils";
import hre from "hardhat";
import { getMockNumericPackage, getRange, MockSignerIndex, WrapperBuilder } from "../../src";
import { expectNumber } from "../assertions";
import { deployContract } from "../commons";
import { SampleSyntheticToken } from "../contract-types";
import { hardhatSigners } from "../hre-utils";
import { NUMBER_OF_MOCK_NUMERIC_SIGNERS } from "../tests-common";

// TODO audit: measure how many bytes do we add to the consumer contracts

describe("SampleSyntheticToken", function () {
  let sampleContract: SampleSyntheticToken,
    wrappedContract: SampleSyntheticToken,
    signer: Signer,
    address: string;

  const toEth = function (val: number) {
    return RedstoneCommon.parseEther(val.toString());
  };
  const toVal = function (val: number) {
    return RedstoneCommon.parseUnits(val.toString(), 26);
  };

  beforeEach(async () => {
    ({ contract: sampleContract } = await deployContract<SampleSyntheticToken>(
      hre,
      "SampleSyntheticToken"
    ));
    await sampleContract.initialize(
      utils.convertStringToBytes32("REDSTONE"),
      "SYNTH-REDSTONE",
      "SREDSTONE"
    );
    [signer] = await hardhatSigners(hre);
    address = await signer.getAddress();

    const mockDataPackages = getRange({
      start: 0,
      length: NUMBER_OF_MOCK_NUMERIC_SIGNERS,
    }).map((i) =>
      getMockNumericPackage({
        dataPoints: [
          {
            dataFeedId: "ETH",
            value: 2000,
          },
          {
            dataFeedId: "REDSTONE",
            value: 200,
          },
        ],
        mockSignerIndex: i as MockSignerIndex,
      })
    );

    wrappedContract = WrapperBuilder.wrap(sampleContract).usingMockDataPackages(mockDataPackages);
  });

  it("Maker balance should be 0", async () => {
    expectNumber(await wrappedContract.balanceOf(address), 0);
  });

  it("Should mint", async () => {
    const tx = await wrappedContract.mint(toEth(100), { value: toEth(20) });
    await tx.wait();

    expectNumber(await wrappedContract.balanceOf(address), toEth(100));
    expectNumber(await wrappedContract.balanceValueOf(address), toVal(20000));
    expectNumber(await wrappedContract.totalValue(), toVal(20000));
    expectNumber(await wrappedContract.collateralOf(address), toEth(20));
    expectNumber(await wrappedContract.collateralValueOf(address), toVal(40000));
    expectNumber(await wrappedContract.debtOf(address), toEth(100));
    expectNumber(await wrappedContract.debtValueOf(address), toVal(20000));
    expectNumber(await wrappedContract.solvencyOf(address), 2000);
  });
});
