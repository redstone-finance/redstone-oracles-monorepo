import { BackwardCompatibleConnector } from "@redstone-finance/multichain-kit";
import {
  ContractParamsProvider,
  getSignersForDataServiceId,
  sampleRun,
} from "@redstone-finance/sdk";
import "dotenv/config";
import { hexlify } from "ethers/lib/utils";
import { readCluster, SolanaConnectionBuilder, SolanaContractConnector } from "../src";
import { readProgramAddress } from "./consts";
import { getRpcUrls } from "./get-rpc-urls";
import { readKeypair } from "./utils";

async function main() {
  const keypair = readKeypair();
  console.log("Public key:", hexlify(keypair.publicKey.toBytes()), keypair.publicKey.toBase58());
  const rpcUrls = await getRpcUrls();
  const connection = new SolanaConnectionBuilder()
    .withCluster(readCluster())
    .withRpcUrls(rpcUrls)
    .build();

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

  const oldConnector = new BackwardCompatibleConnector(solanaContractConnector);

  await sampleRun(paramsProvider, oldConnector);
}

void main();
