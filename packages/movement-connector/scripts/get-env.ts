import { RedstoneCommon } from "@redstone-finance/utils";
import { z } from "zod";
import {
  MovementNetworkSchema,
  movementNetworkSchemaToAptosNetwork,
} from "../src";

import { ContractNameEnum } from "./contract-name-enum";

export function getEnvNetwork() {
  return RedstoneCommon.getFromEnv(
    "NETWORK",
    MovementNetworkSchema.optional().transform((networkName) =>
      movementNetworkSchemaToAptosNetwork(networkName)
    )
  );
}

export function getEnvContractName() {
  return RedstoneCommon.getFromEnv("CONTRACT_NAME", ContractNameEnum);
}

export function getEnvDeployDir() {
  return RedstoneCommon.getFromEnv(
    "DEPLOY_DIR",
    z.string().optional().default("./movement/contracts")
  );
}
