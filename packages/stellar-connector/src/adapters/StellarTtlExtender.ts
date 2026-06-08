import { loggerFactory, RedstoneCommon } from "@redstone-finance/utils";
import { Keypair } from "@stellar/stellar-sdk";
import { StellarClient } from "../client/StellarClient";
import { StellarTxDeliveryManConfig } from "../tx/StellarTxDeliveryManConfig";
import { PriceFeedTtlExtender } from "./PriceFeedTtlExtender";
import { Sep40TtlExtender } from "./Sep40TtlExtender";

const logger = loggerFactory("stellar-ttl-extenders");

export interface StellarTtlExtender {
  extendTtlIfNeeded(): Promise<void>;
}

export async function runExtenders(extenders: StellarTtlExtender[]) {
  await RedstoneCommon.runWithPartialFailure(
    extenders,
    (extender) => extender.extendTtlIfNeeded(),
    (error) => logger.error(`TTL extension failed: ${RedstoneCommon.stringifyError(error)}`),
    "All TTL extension attempts failed"
  );
}

export function getExtender(
  client: StellarClient,
  address: string,
  keypair: Keypair,
  type: "sep40",
  config?: Partial<StellarTxDeliveryManConfig>
): StellarTtlExtender;
export function getExtender(
  client: StellarClient,
  addresses: string[],
  keypair: Keypair,
  type: "price-feed"
): StellarTtlExtender;
export function getExtender(
  client: StellarClient,
  contractOrAddresses: string | string[],
  keypair: Keypair,
  type: "sep40" | "price-feed",
  config?: Partial<StellarTxDeliveryManConfig>
): StellarTtlExtender {
  switch (type) {
    case "sep40":
      return new Sep40TtlExtender(client, contractOrAddresses as string, keypair, config);
    case "price-feed":
      return new PriceFeedTtlExtender(client, contractOrAddresses as string[], keypair);
    default:
      return RedstoneCommon.throwUnsupportedParamError(type);
  }
}
