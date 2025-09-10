import { RadixEngineToolkit } from "@radixdlt/radix-engine-toolkit";
import { arrayify } from "ethers/lib/utils";
import { COMPILED_TRANSACTION } from "./config";

export async function decompileIntent(compiledIntent: string) {
  return await RadixEngineToolkit.Intent.decompile(arrayify(compiledIntent), "String");
}

async function main(compiledIntent: string) {
  const intent = await decompileIntent(compiledIntent);

  console.log(intent);
}

void main(COMPILED_TRANSACTION);
