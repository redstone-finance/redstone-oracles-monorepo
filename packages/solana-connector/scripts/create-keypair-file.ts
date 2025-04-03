import fs from "fs";
import { readKeypair } from "./utils";

export function createKeypairFile(resultFilePath = "solana-keypair.json") {
  const keypair = readKeypair();

  fs.writeFileSync(
    resultFilePath,
    JSON.stringify(Array.from(keypair.secretKey))
  );

  return {
    success: true,
    filePath: resultFilePath,
    publicKey: keypair.publicKey,
  };
}
