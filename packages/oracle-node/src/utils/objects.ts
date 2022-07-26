import fs from "fs";

export function mergeObjects(objects: Array<any>) {
  return Object.assign({}, ...objects);
}

export function readJSON(path: string): any {
  const content = fs.readFileSync(path, "utf-8");
  try {
    return JSON.parse(content);
  } catch (e: any) {
    throw new Error(`File "${path}" does not contain a valid JSON`);
  }
}

export function getRequiredPropValue(obj: any, prop: string): any {
  if (obj[prop] === undefined) {
    throw new Error(
      `Object does not contain required property "${prop}". Obj: ` +
        JSON.stringify(obj)
    );
  }

  return obj[prop];
}
