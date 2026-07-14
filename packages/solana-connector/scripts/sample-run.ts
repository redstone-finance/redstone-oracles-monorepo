import { sampleRun } from "@redstone-finance/multichain-kit";
import { ContractParamsProvider, getSignersForDataServiceId } from "@redstone-finance/sdk";
import { RedstoneCommon } from "@redstone-finance/utils";
import "dotenv/config";
import { hexlify } from "ethers/lib/utils";
import {
  DEFAULT_SOLANA_CONFIG,
  makeSolanaUpdater,
  readCluster,
  SolanaBlockchainService,
  SolanaClientBuilder,
  SolanaWriteContractAdapter,
} from "../src";
import { readProgramAddress } from "./consts";
import { getRpcUrls } from "./get-rpc-urls";
import { readKeypair } from "./utils";

async function main() {
  const keypair = readKeypair();
  console.log("Public key:", hexlify(keypair.publicKey.toBytes()), keypair.publicKey.toBase58());
  const rpcUrls = await getRpcUrls();
  const { client, jito } = new SolanaClientBuilder()
    .withCluster(readCluster())
    .withRpcUrls(rpcUrls)
    .buildWithJito();

  const paramsProvider = new ContractParamsProvider({
    dataPackagesIds: ["ETH", "BTC"],
    dataServiceId: "redstone-primary-prod",
    uniqueSignersCount: 3,
    authorizedSigners: getSignersForDataServiceId("redstone-primary-prod"),
  });

  const updater = makeSolanaUpdater({ client, jito }, readProgramAddress(readCluster()), keypair, {
    ...DEFAULT_SOLANA_CONFIG,
    canSendViaJito: true,
    expectedTxDeliveryTimeMs: RedstoneCommon.secsToMs(7),
  });
  const adapter = new SolanaWriteContractAdapter(client, updater);

  const service = new SolanaBlockchainService(client);

  await sampleRun(paramsProvider, adapter, service);
}

void main();
