import { Env, NonEvmChainType } from "@redstone-finance/chain-configs";
import { getSSMParameterValue } from "@redstone-finance/internal-utils";
import { RedstoneCommon } from "@redstone-finance/utils";

export async function getNonEvmZrodelkoPrivateKey(
  env: Env,
  chainType: NonEvmChainType
): Promise<RedstoneCommon.PrivateKey> {
  const ssmPath = `/${env}/${chainType}/zrodelko/private-key`;
  const privateKey = await getSSMParameterValue(ssmPath);
  switch (chainType) {
    case "radix": {
      return {
        scheme: "ed25519",
        value: privateKey,
      } as RedstoneCommon.PrivateKey;
    }
    default:
      return {
        scheme: "secp256k1",
        value: privateKey,
      } as RedstoneCommon.PrivateKey;
  }
}
