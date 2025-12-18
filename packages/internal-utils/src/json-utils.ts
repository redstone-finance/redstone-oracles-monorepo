import { readFileSync, writeFileSync } from "fs";

/**
 * Checks for duplicate keys in a JSON string at any nesting level.
 * This function parses the JSON string character by character to detect
 * duplicate keys before the native JSON.parse resolves them.
 * This code is not intended to be used in runtime, only in CI checks
 * @throws Error if duplicate keys are found at any level
 */
export function checkForDuplicateKeys(jsonString: string): void {
  let inString = false;
  let escape = false;
  let currentKey = "";
  let collectingKey = false;
  const objectStack: Set<string>[] = [];

  for (let i = 0; i < jsonString.length; i++) {
    const char = jsonString[i];

    if (escape) {
      if (collectingKey) {
        currentKey += char;
      }
      escape = false;
      continue;
    }

    if (char === "\\") {
      escape = true;
      if (collectingKey) {
        currentKey += char;
      }
      continue;
    }

    if (char === '"') {
      if (!inString) {
        inString = true;
        let j = i - 1;
        while (j >= 0 && /\s/.test(jsonString[j])) {
          j--;
        }
        if (j >= 0 && (jsonString[j] === "{" || jsonString[j] === ",")) {
          collectingKey = true;
          currentKey = "";
        }
      } else {
        inString = false;
        if (collectingKey) {
          let j = i + 1;
          while (j < jsonString.length && /\s/.test(jsonString[j])) {
            j++;
          }
          if (j < jsonString.length && jsonString[j] === ":") {
            const currentSet = objectStack[objectStack.length - 1];
            if (currentSet.has(currentKey)) {
              throw new Error(`Duplicate key "${currentKey}" found in JSON`);
            }
            currentSet.add(currentKey);
          }
          collectingKey = false;
          currentKey = "";
        }
      }
      continue;
    }

    if (!inString) {
      if (char === "{") {
        objectStack.push(new Set());
      } else if (char === "}") {
        objectStack.pop();
      }
    } else if (collectingKey) {
      currentKey += char;
    }
  }
}

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
