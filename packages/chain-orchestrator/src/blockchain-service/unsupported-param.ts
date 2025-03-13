export function unsupportedParam(arg: never): never {
  throw new Error(`Unsupported param ${String(arg)}`);
}
