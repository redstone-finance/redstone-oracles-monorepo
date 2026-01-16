import { RedstoneCommon } from "@redstone-finance/utils";
import { LEDGERS_PER_DAY, makeKeypair, StellarClientBuilder } from "../src";
import { StellarSigner } from "../src/stellar/StellarSigner";
import { loadContractId, readNetwork, readUrl } from "./utils";

async function main(daysToExtend = 15) {
  const keypair = makeKeypair();

  const client = new StellarClientBuilder()
    .withStellarNetwork(readNetwork())
    .withRpcUrl(readUrl())
    .build();
  const contractId = loadContractId();

  const currentTtl = await client.getInstanceTtl(contractId);
  console.log(`Current TTL: ${RedstoneCommon.stringify(currentTtl)}`);

  const extendedTtl = await client.extendInstanceTtl(
    contractId,
    new StellarSigner(keypair),
    daysToExtend * LEDGERS_PER_DAY
  );
  console.log(`Extending TTL transaction Id: ${RedstoneCommon.stringify(extendedTtl)}`);
}

void main().catch((err) => console.log(err));
