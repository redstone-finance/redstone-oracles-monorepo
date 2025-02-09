import { AccountAddress, createObjectAddress } from "@aptos-labs/ts-sdk";
import { RedstoneCommon } from "@redstone-finance/utils";
import { execSync } from "child_process";
import "dotenv/config";
import { MovementNetworkSchema, SEED } from "../src";
import { ResponseConfigOutputSchema } from "../src/types";

function executeCommand(command: string): string {
  return execSync(command, { cwd: "./movement", encoding: "utf8" });
}

async function executeMovementPublish(
  network: string,
  packageDir: string,
  namedAddresses: string
): Promise<string> {
  const cwd = process.cwd();
  try {
    const cmd = [
      "move",
      "publish",
      "--package-dir",
      packageDir,
      "--named-addresses",
      namedAddresses,
      "--assume-yes",
    ];
    if (network === "devnet") {
      cmd.push("--dev");
    }
    const output = executeCommand(["movement"].concat(cmd).join(" "));
    return output;
  } catch (error) {
    console.error("Error executing movement client publish:", error);
    throw error;
  } finally {
    process.chdir(cwd);
  }
}

function printOutputPublish(operation: string, output: string) {
  console.log(`${operation} output: ${output}`);
}

async function main() {
  const network = RedstoneCommon.getFromEnv("NETWORK", MovementNetworkSchema);
  const profile: string = executeCommand(
    ["movement", "config", "show-profiles"].join(" ")
  );
  const configProfile: ResponseConfigOutputSchema = JSON.parse(profile);
  if (
    !configProfile.Result.default.rest_url.includes(
      network === "custom" ? "testnet" : network
    )
  ) {
    throw new Error(`Not on ${network}, network is set to ${profile}`);
  }

  const packageDirPriceAdapter = "contracts/price_adapter";
  const namedAddressesPriceAdapter = "redstone_price_adapter=default";
  const publishPriceAdapterResult = await executeMovementPublish(
    network,
    packageDirPriceAdapter,
    namedAddressesPriceAdapter
  );
  printOutputPublish(packageDirPriceAdapter, publishPriceAdapterResult);

  const adapterAddress = createObjectAddress(
    AccountAddress.fromString(configProfile.Result.default.account),
    SEED
  ).toString();
  const packageDirPriceFeed = "contracts/price_feed";
  const namedAddressesPriceFeed = `redstone_price_adapter=default,price_feed=default,price_adapter_object_address=${adapterAddress}`;
  const publishPriceFeedResult = await executeMovementPublish(
    network,
    packageDirPriceFeed,
    namedAddressesPriceFeed
  );
  printOutputPublish(packageDirPriceFeed, publishPriceFeedResult);
}

void main();
