export function throwUnsupportedParamError(arg: never): never {
  throw new Error(`Unsupported param ${String(arg)}`);
}
