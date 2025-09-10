import { createHash } from "crypto";
import fs from "fs";
import path from "path";

function getAllFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
  const files = fs.readdirSync(dirPath);

  files.forEach(function (file) {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      getAllFiles(fullPath, arrayOfFiles);
    } else {
      arrayOfFiles.push(fullPath);
    }
  });

  return arrayOfFiles;
}

export function calculateSHA256(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

export function calculateFileHash(filePath: string): string {
  const content = fs.readFileSync(filePath);
  return calculateSHA256(content);
}

export function calculateBuffersHash(buffers: Buffer[]): string {
  const hashes = buffers.map((buffer) => calculateSHA256(buffer));
  return calculateCombinedHash(hashes);
}

export function calculateCombinedHash(hashes: string[]): string {
  const sortedHashes = [...hashes].sort();
  return calculateSHA256(Buffer.from(sortedHashes.join("")));
}

export function calculateDirectoryHash(directoryPath: string): string {
  const allFilePaths = getAllFiles(directoryPath);
  const fileHashes = allFilePaths.map((filePath) => calculateFileHash(filePath));
  return calculateCombinedHash(fileHashes);
}
