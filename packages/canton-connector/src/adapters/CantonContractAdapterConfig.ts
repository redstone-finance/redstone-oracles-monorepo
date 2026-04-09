import { RedstoneCommon } from "@redstone-finance/utils";
import { z } from "zod";

export type CantonContractAdapterConfig = {
  viewerPartyId: string;
  updaterPartyId: string;
  adapterId: string;
  additionalPillViewers?: string[];
  maxTxSendAttempts: number;
  expectedTxDeliveryTimeInMs: number;
  uniqueSignerThreshold: number;
};

export const CANTON_CONTRACT_ADAPTER_DEFAULT_CONFIG: Pick<
  CantonContractAdapterConfig,
  "maxTxSendAttempts" | "expectedTxDeliveryTimeInMs" | "uniqueSignerThreshold"
> = {
  maxTxSendAttempts: 5,
  expectedTxDeliveryTimeInMs: RedstoneCommon.secsToMs(15),
  uniqueSignerThreshold: 3,
};

export function readAdditionalPillViewers() {
  return RedstoneCommon.getFromEnv("ADDITIONAL_PILL_VIEWERS", z.array(z.string()).optional());
}
