import { RedstoneCommon } from "@redstone-finance/utils";
import { z } from "zod";
import { CantonNetwork, networkToChainId } from "../CantonNetwork";

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
  // Canton has no fee escalation, so a re-submission would only race the pending one.
  maxTxSendAttempts: 1,
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

export function readCantonPartyIds(network: CantonNetwork) {
  const chainId = networkToChainId(network);
  const perChain = (name: string) =>
    RedstoneCommon.getFromEnv(`CANTON_${chainId}_${name}`, z.string().optional());

  return {
    viewerPartyId:
      perChain("VIEWER_PARTY_ID") ?? RedstoneCommon.getFromEnv("CANTON_VIEWER_PARTY_ID"),
    updaterPartyId:
      perChain("UPDATER_PARTY_ID") ??
      RedstoneCommon.getFromEnv("CANTON_UPDATER_PARTY_ID", z.string().optional()),
  };
}
