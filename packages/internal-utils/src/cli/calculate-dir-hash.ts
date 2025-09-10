#!/usr/bin/env node
import { calculateDirectoryHash } from "../hash-utils";

const dirPath = process.argv[2];

if (!dirPath) {
  process.stderr.write("Usage: calculate-dir-hash <directoryPath>\n");
  process.exit(1);
}

try {
  const hash = calculateDirectoryHash(dirPath);
  process.stdout.write(hash);
} catch (error) {
  let errorMessage = "An unknown error occurred";
  if (error instanceof Error && error.message) {
    errorMessage = error.message;
  } else if (typeof error === "string") {
    errorMessage = error;
  }

  process.stderr.write(`Error calculating hash for directory ${dirPath}: ${errorMessage}\n`);
  process.exit(1);
}
