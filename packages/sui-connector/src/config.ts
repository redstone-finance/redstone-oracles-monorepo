import { z } from "zod";
import { DEFAULT_GAS_BUDGET } from "./SuiContractUtil";

const DEFAULT_GAS_MULTIPLIER = 1.4;
const DEFAULT_MAX_TX_SEND_ATTEMPTS = 8;
const DEFAULT_EXPECTED_DELIVERY_TIME_MS = 8_000;

export const SuiNetworkSchema = z.enum(["mainnet", "testnet", "localnet", "devnet"]);
export type SuiNetworkName = z.infer<typeof SuiNetworkSchema>;

export interface SuiConfig {
  packageId: string;
  priceAdapterObjectId: string;
  writePricesTxGasBudget: bigint;
  gasMultiplier: number;
  maxTxSendAttempts: number;
  expectedTxDeliveryTimeInMs: number;
}

export function makeSuiConfig(
  args: Partial<SuiConfig> & Pick<SuiConfig, "packageId" | "priceAdapterObjectId">
): SuiConfig {
  return {
    packageId: args.packageId,
    priceAdapterObjectId: args.priceAdapterObjectId,
    writePricesTxGasBudget: args.writePricesTxGasBudget ?? DEFAULT_GAS_BUDGET,
    gasMultiplier: args.gasMultiplier ?? DEFAULT_GAS_MULTIPLIER,
    maxTxSendAttempts: args.maxTxSendAttempts ?? DEFAULT_MAX_TX_SEND_ATTEMPTS,
    expectedTxDeliveryTimeInMs:
      args.expectedTxDeliveryTimeInMs ?? DEFAULT_EXPECTED_DELIVERY_TIME_MS,
  };
}
