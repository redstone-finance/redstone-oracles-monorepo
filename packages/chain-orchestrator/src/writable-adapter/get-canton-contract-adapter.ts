import {
  CantonClientBuilder,
  PricesCantonContractAdapter,
} from "@redstone-finance/canton-connector";
import { RedstoneCommon } from "@redstone-finance/utils";
import { z } from "zod";
import { PartialRelayerConfig } from "./partial-relayer-config";

export const getCantonContractAdapter = (relayerConfig: PartialRelayerConfig) => {
  const { adapterContractAddress, adapterContractPackageId, rpcUrls, networkId, privateKey } =
    relayerConfig;

  const client = new CantonClientBuilder()
    .withRpcUrls(rpcUrls)
    .withNetworkId(networkId)
    .withDefaultAuth(privateKey)
    .build();

  const additionalPillViewers = RedstoneCommon.getFromEnv(
    "ADDITIONAL_PILL_VIEWERS",
    z.array(z.string()).optional()
  );

  return new PricesCantonContractAdapter(
    client,
    RedstoneCommon.getFromEnv("VIEWER_PARTY_ID"),
    RedstoneCommon.getFromEnv("UPDATER_PARTY_ID"),
    adapterContractAddress,
    additionalPillViewers,
    adapterContractPackageId
  );
};
