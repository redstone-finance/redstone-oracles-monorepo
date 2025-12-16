// Node

import { isDefined } from "./objects";

type MaybeNode = { process?: { versions: { node: string }; env: Record<string, string> } };
const nodeGlobalThis = globalThis as unknown as MaybeNode;

export const getNodeVersion = (): string | undefined => nodeGlobalThis.process?.versions.node;
export const isNodeRuntime = () => isDefined(getNodeVersion());

// Deno

type MaybeDeno = {
  Deno?: {
    version: { deno: string };
    env: { toObject: () => Record<string, string> };
  };
};
const denoGlobalThis = globalThis as unknown as MaybeDeno;

export const getDenoVersion = (): string | undefined => denoGlobalThis.Deno?.version.deno;
export const isDenoRuntime = () => isDefined(getDenoVersion());

// Env

export const getEnv = (): Record<string, string> => {
  if (isNodeRuntime()) {
    return nodeGlobalThis.process!.env;
  }
  if (isDenoRuntime()) {
    return denoGlobalThis.Deno!.env.toObject();
  }
  return {};
};
