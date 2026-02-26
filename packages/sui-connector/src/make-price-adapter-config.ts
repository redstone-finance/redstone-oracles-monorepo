import { DataServiceIds, getSignersForDataServiceId } from "@redstone-finance/sdk";
import { RedstoneCommon } from "@redstone-finance/utils";
import { PriceAdapterConfig } from "./PriceAdapterConfig";
import { DEFAULT_GAS_BUDGET } from "./SuiContractUtil";
import { SuiNetworkName } from "./config";

const DEFAULT_INTERVAL = RedstoneCommon.hourToMs(48);

export function makeSuiDeployConfig(
  dataServiceId: DataServiceIds = "redstone-primary-prod",
  network?: SuiNetworkName,
  minIntervalBetweenUpdatesMs?: number
): PriceAdapterConfig {
  const minInterval = minIntervalBetweenUpdatesMs ?? DEFAULT_INTERVAL;

  if (minInterval !== DEFAULT_INTERVAL && network !== "localnet") {
    throw new Error("Custom interval only available on localnet network");
  }

  return {
    signerCountThreshold: 3,
    maxTimestampDelayMs: RedstoneCommon.minToMs(3),
    maxTimestampAheadMs: RedstoneCommon.minToMs(1),
    signers: getSignersForDataServiceId(dataServiceId),
    trustedUpdaters: [
      "0xbd288ccf0f92df315f7b212e5481f4f2b469f6c61c0d58a16e616eb2e0341f9c",
      "0xfcb82d9138f1aed43fd1259c94fe20890c2f48297dc673d354efd9f9572f0319",
      "0x0b4e848b21b2a942f8bb0f4d4496462b059c206ae68d116091bed41a72408cbb",
      "0xb26ea44ea1b80e916875b47fe3ec335b8a0d37b65f46052a467fe4878165bc6d",
    ],
    minIntervalBetweenUpdatesMs: minInterval,
    initializeTxGasBudget: DEFAULT_GAS_BUDGET,
  };
}
