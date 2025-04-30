import {
  fetchChainConfigs,
  getChainConfigByChainId,
} from "@redstone-finance/chain-configs";
import {
  ContractParamsProvider,
  getSignersForDataServiceId,
  sampleRun,
} from "@redstone-finance/sdk";
import { RedstoneCommon } from "@redstone-finance/utils";
import "dotenv/config";
import { hexlify } from "ethers/lib/utils";
import _ from "lodash";
import z from "zod";
import {
  CLUSTER_NAMES,
  readCluster,
  SolanaConnectionBuilder,
  SolanaContractConnector,
} from "../src";
import { readProgramAddress } from "./consts";
import { readKeypair, readUrl } from "./utils";

async function main() {
  const keypair = readKeypair();
  console.log("Public key:", hexlify(keypair.publicKey.toBytes()));
  const rpcUrls = await getRpcUrls();
  const connection = new SolanaConnectionBuilder().withRpcUrls(rpcUrls).build();

  const paramsProvider = new ContractParamsProvider({
    dataPackagesIds: ["ETH", "BTC"],
    dataServiceId: "redstone-primary-prod",
    uniqueSignersCount: 3,
    authorizedSigners: getSignersForDataServiceId("redstone-primary-prod"),
  });

  const solanaContractConnector = new SolanaContractConnector(
    connection,
    readProgramAddress(readCluster()),
    keypair
  );

  await sampleRun(paramsProvider, solanaContractConnector);
}

async function getRpcUrls() {
  if (
    RedstoneCommon.getFromEnv(
      "OVERRIDE_URLS_BY_ENV",
      z.boolean().default(false)
    )
  ) {
    return [readUrl()];
  }

  return getChainConfigByChainId(
    await fetchChainConfigs(),
    Number(_.findKey(CLUSTER_NAMES, (c) => c === readCluster())!),
    "solana"
  ).publicRpcUrls;
}

void main();
