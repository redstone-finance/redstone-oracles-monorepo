import { fromBase64 } from "@mysten/bcs";
import { RedstoneCommon } from "@redstone-finance/utils";
import * as crypto from "crypto";
import "dotenv/config";
import { buildPackage, getDeployDir, SuiNetworkSchema } from "../src";

function main() {
  const packagePath = getDeployDir();
  const network = RedstoneCommon.getFromEnv("NETWORK", SuiNetworkSchema);
  const { modules } = buildPackage(packagePath, network);

  const modulesHashes = modules
    .map((mod) => Buffer.from(fromBase64(mod)))
    .map((buff) => crypto.createHash("sha256").update(buff).digest("hex"));

  console.log(modulesHashes);
}

void main();
