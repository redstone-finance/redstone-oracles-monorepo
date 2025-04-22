import { Env, NonEvmChainType } from "@redstone-finance/chain-configs";
import { getSSMParameterValue } from "@redstone-finance/internal-utils";
import { RedstoneCommon } from "@redstone-finance/utils";

const ed25519Chains = ["radix", "solana", "sui"];

export async function getNonEvmZrodelkoPrivateKey(
  env: Env,
  chainType: NonEvmChainType
): Promise<RedstoneCommon.PrivateKey> {
  const ssmPath = `/${env}/${chainType}/zrodelko/private-key`;
  const privateKey = await getSSMParameterValue(ssmPath, "eu-west-1");
  return {
    scheme: ed25519Chains.includes(chainType) ? "ed25519" : "secp256k1",
    value: privateKey,
  } as RedstoneCommon.PrivateKey;
}
