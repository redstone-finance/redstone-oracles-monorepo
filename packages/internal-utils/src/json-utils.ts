import { readFileSync, writeFileSync } from "fs";

export const readJsonFile = <T = unknown>(path: string): T => {
  const content = readFileSync(path, "utf-8");
  try {
    return JSON.parse(content) as T;
  } catch (e) {
    throw new Error(`File "${path}" does not contain a valid JSON`, {
      cause: e,
    });
  }
};

export const saveJsonFile = (filePath: string, data: unknown) => {
  try {
    const jsonData = JSON.stringify(data, null, 2);
    writeFileSync(filePath, jsonData, "utf-8");
    console.log(`File was saved successfully: ${filePath}`);
  } catch (error) {
    console.error(`Error writing file to disk: ${JSON.stringify(error)}`);
  }
};
