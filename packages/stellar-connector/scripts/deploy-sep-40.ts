import { Address } from "@stellar/stellar-sdk";
import { makeKeypair, StellarClientBuilder, StellarOperationSender } from "../src";
import { StellarSep40ContractDeployer } from "../src/stellar/StellarSep40ContractDeployer";
import { StellarSigner } from "../src/stellar/StellarSigner";
import { FEEDS } from "./consts";
import { readNetwork, readUrl, saveSep40Id, SEP40_CONTRACT, wasmFilePath } from "./utils";

const BASE_ASSET = { tag: "Other" as const, symbol: "USD" };

const FEED_MAPPINGS = FEEDS.map((feed) => ({
  feed,
  asset: { tag: "Other" as const, symbol: feed },
}));

async function deploySep40() {
  const keypair = makeKeypair();
  const client = new StellarClientBuilder()
    .withStellarNetwork(readNetwork())
    .withRpcUrl(readUrl())
    .build();

  const sender = new StellarOperationSender(new StellarSigner(keypair), client);
  const deployer = new StellarSep40ContractDeployer(client, sender);

  const owner = Address.fromString(keypair.publicKey());

  const result = await deployer.deploySep40(
    wasmFilePath(SEP40_CONTRACT),
    owner,
    BASE_ASSET,
    FEED_MAPPINGS
  );

  saveSep40Id(result.contractId);
  console.log(`🚀 SEP-40 contract deployed at: ${result.contractId}`);
  console.log(`   WASM hash: ${result.wasmHash}`);
}

void deploySep40();
