import { RedstoneCommon } from "@redstone-finance/utils";
import { CantonClient } from "../client/CantonClient";
import { CantonTrafficMeter } from "../tx/CantonTrafficMeter";
import { CantonContractAdapterConfig } from "./CantonContractAdapterConfig";
import { CapsCapsuleArchiverCantonContractAdapter } from "./CapsCapsuleArchiverCantonContractAdapter";
import { CapsOracleCantonContractAdapter } from "./CapsOracleCantonContractAdapter";
import { CapsRewardsCantonContractAdapter } from "./CapsRewardsCantonContractAdapter";
import { CapsRoundArchiverCantonContractAdapter } from "./CapsRoundArchiverCantonContractAdapter";
import { PricesCantonContractAdapter } from "./PricesCantonContractAdapter";

export function makeCantonContractAdapter(
  client: CantonClient,
  config: CantonContractAdapterConfig,
  packageId = client.getDefs().interfaceId
) {
  return packageId === client.getDefs().capsOracleId
    ? <PricesCantonContractAdapter>(
        new CapsOracleCantonContractAdapter(client, config, (trafficMeter) =>
          makePlugins(client, config, trafficMeter)
        )
      )
    : new PricesCantonContractAdapter(client, config, packageId);
}

function makePlugins(
  client: CantonClient,
  {
    updaterPartyId,
    adapterId,
    capsRoundArchiveIntervalMs,
    capsCapsuleArchiveIntervalMs,
    capsRewardsIntervalMs,
  }: Pick<
    CantonContractAdapterConfig,
    | "updaterPartyId"
    | "adapterId"
    | "capsRoundArchiveIntervalMs"
    | "capsCapsuleArchiveIntervalMs"
    | "capsRewardsIntervalMs"
  >,
  trafficMeter: CantonTrafficMeter
) {
  return [
    RedstoneCommon.isDefined(capsRoundArchiveIntervalMs)
      ? new CapsRoundArchiverCantonContractAdapter(
          client,
          updaterPartyId,
          capsRoundArchiveIntervalMs,
          adapterId
        )
      : undefined,
    RedstoneCommon.isDefined(capsCapsuleArchiveIntervalMs)
      ? new CapsCapsuleArchiverCantonContractAdapter(
          client,
          updaterPartyId,
          capsCapsuleArchiveIntervalMs,
          adapterId
        )
      : undefined,
    RedstoneCommon.isDefined(capsRewardsIntervalMs)
      ? new CapsRewardsCantonContractAdapter(
          client,
          updaterPartyId,
          capsRewardsIntervalMs,
          trafficMeter
        )
      : undefined,
  ].filter(RedstoneCommon.isDefined);
}
