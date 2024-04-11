import hre from "hardhat";
import { expect } from "chai";
import { before } from "mocha";
import { Web3FunctionHardhat } from "@gelatonetwork/web3-functions-sdk/hardhat-plugin";
// @ts-ignore
import * as args from "./userArgs.json";

import { Web3FunctionResultCallData } from "@gelatonetwork/web3-functions-sdk";

const { w3f } = hre;

describe("RedStone Gelato w3f: On-chain Relayer & remote manifest e2e Tests", function () {
  this.timeout(0);

  let redstoneW3f: Web3FunctionHardhat;

  before(async function () {
    redstoneW3f = w3f.get("redstone");
  });

  it("Return canExec: true when update is needed", async () => {
    const userArgs: any = { ...args };
    const { result } = await redstoneW3f.run("onRun", { userArgs });
    expect(result.canExec).to.equal(true);

    const callData = (
      result as {
        canExec: true;
        callData: Web3FunctionResultCallData[];
      }
    ).callData;

    expect(callData.length).to.equal(1);
    expect(callData[0].to).to.equal(
      "0x11B714817cBC92D402383cFd3f1037B122dcf69A"
    );
  });
});
