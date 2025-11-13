import { fromBase64 } from "@mysten/bcs";
import * as crypto from "crypto";
import "dotenv/config";
import { buildPackage, getDeployDir } from "../src";

function main() {
  const packagePath = getDeployDir();
  const { modules } = buildPackage(packagePath);

  const modulesHashes = modules
    .map((mod) => Buffer.from(fromBase64(mod)))
    .map((buff) => crypto.createHash("sha256").update(buff).digest("hex"));

  console.log(modulesHashes);
}

void main();
