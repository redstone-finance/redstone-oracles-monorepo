import { RedstoneCommon } from "@redstone-finance/utils";
import { z } from "zod";

import { MoveNetworkSchema } from "./config";
import { ContractNameEnum } from "./contract-name-enum";

export function getEnvNetwork() {
  return RedstoneCommon.getFromEnv("NETWORK", MoveNetworkSchema);
}

export function getEnvContractName() {
  return RedstoneCommon.getFromEnv("CONTRACT_NAME", ContractNameEnum);
}

export function getEnvDeployDir() {
  return RedstoneCommon.getFromEnv(
    "DEPLOY_DIR",
    z.string().optional().default("./move/contracts")
  );
}
