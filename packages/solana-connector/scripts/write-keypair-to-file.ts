import fs from "fs";
import path from "node:path";
import { readKeypair } from "./utils";

export function writeKeypairToFile(
  dir = ".",
  filename = "solana-keypair.json"
) {
  const keypair = readKeypair();

  fs.writeFileSync(
    path.join(dir, filename),
    JSON.stringify(Array.from(keypair.secretKey))
  );

  return {
    success: true,
    filePath: path.join(dir, filename),
    filename,
    publicKey: keypair.publicKey,
  };
}
