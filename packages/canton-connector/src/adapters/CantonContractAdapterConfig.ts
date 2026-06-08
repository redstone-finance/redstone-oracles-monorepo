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
  shouldAccumulateTraffic: boolean;
  useConstTrafficMeter: boolean;
  totalFeedCount: number;
};

export const CANTON_CONTRACT_ADAPTER_DEFAULT_CONFIG: Pick<
  CantonContractAdapterConfig,
  | "maxTxSendAttempts"
  | "expectedTxDeliveryTimeInMs"
  | "uniqueSignerThreshold"
  | "shouldAccumulateTraffic"
  | "useConstTrafficMeter"
> = {
  maxTxSendAttempts: 5,
  expectedTxDeliveryTimeInMs: RedstoneCommon.secsToMs(15),
  uniqueSignerThreshold: 3,
  shouldAccumulateTraffic: true,
  useConstTrafficMeter: false,
};

export function readAdditionalPillViewers() {
  return RedstoneCommon.getFromEnv(
    "CANTON_ADDITIONAL_PILL_VIEWERS",
    z.array(z.string()).optional()
  );
}

export function readUseConstTrafficMeter() {
  return RedstoneCommon.getFromEnv("CANTON_USE_CONST_TRAFFIC_METER", z.boolean().default(false));
}
