import {
  deconstructNetworkId,
  Env,
  NetworkId,
} from "@redstone-finance/chain-configs";
import { getSSMParameterValue } from "@redstone-finance/internal-utils";
import { RedstoneCommon } from "@redstone-finance/utils";

const ed25519Chains = ["radix", "solana", "sui", "movement"];

export async function getNonEvmZrodelkoPrivateKey(
  networkId: NetworkId,
  env: Env
): Promise<RedstoneCommon.PrivateKey> {
  const { chainType } = deconstructNetworkId(networkId);
  const ssmPath = `/${env}/${chainType}/zrodelko/private-key`;
  const privateKey = await getSSMParameterValue(ssmPath, "eu-west-1");
  if (!privateKey) {
    throw new Error(`parameter ${ssmPath} not found in SSM`);
  }
  return {
    scheme: ed25519Chains.includes(chainType) ? "ed25519" : "secp256k1",
    value: privateKey,
  };
}
