import {
  checkWalletTransactions,
  RedStoneTxStatsInfluxService,
} from "@redstone-finance/internal-utils";
import {
  getLocalMonitoringManifest,
  MANIFEST_TYPE_RELAYERS,
  MonitoringEnv,
} from "@redstone-finance/monitoring-manifests";
import { readAllManifestsAsCommon } from "../../scripts/read-manifests";
import { checkMany } from "../common/check-many";
import { findRelayerManifest } from "../common/find-relayer-manifest";

const relayers = getLocalMonitoringManifest(
  MonitoringEnv.prod,
  MANIFEST_TYPE_RELAYERS
);
const manifests = readAllManifestsAsCommon();
const influxService = RedStoneTxStatsInfluxService.withEnvParams();

checkMany(
  "Check wallet transactions",
  "on-chain relayer wallet transactions",
  Object.keys(relayers),
  checkOnChainRelayerWalletTransactions
);

async function checkOnChainRelayerWalletTransactions(relayerId: string) {
  const {
    relayerManifest,
    walletsToMonitor,
    acceptableWalletsToMonitorLength,
  } = findRelayerManifest(relayerId, relayers, manifests);

  if ((walletsToMonitor?.length ?? 0) !== acceptableWalletsToMonitorLength) {
    throw new Error(
      `Wrong number of wallets to monitor: ${walletsToMonitor?.length} when ${acceptableWalletsToMonitorLength} expected.`
    );
  }

  if (!walletsToMonitor) {
    return;
  }

  await checkWalletTransactions(
    influxService,
    relayerManifest,
    walletsToMonitor,
    relayerId
  );
}
