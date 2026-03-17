import { sampleRun } from "@redstone-finance/multichain-kit";
import { ContractParamsProvider, getSignersForDataServiceId } from "@redstone-finance/sdk";
import "dotenv/config";
import { hexlify } from "ethers/lib/utils";
import {
  readCluster,
  SolanaBlockchainService,
  SolanaClient,
  SolanaConnectionBuilder,
  SolanaWriteContractAdapter,
} from "../src";
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

  const adapter = new SolanaWriteContractAdapter(
    connection,
    readProgramAddress(readCluster()),
    keypair
  );

  const service = new SolanaBlockchainService(new SolanaClient(connection));

  await sampleRun(paramsProvider, adapter, service);
}

void main();
