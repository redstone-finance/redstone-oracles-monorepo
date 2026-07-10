import { RedstoneCommon } from "@redstone-finance/utils";
import "dotenv/config";
import { z } from "zod";
import * as AllDefs from "../src/canton-defs.json";
import { makeDefaultClientWithValidator, readNetwork } from "./utils";

async function main() {
  const network = readNetwork();
  const faLockingPartyId = z
    .string({ message: `primaryFaLockingPartyId is not configured for network: ${network}` })
    .parse(AllDefs[network].node.primaryFaLockingPartyId);
  const amount = RedstoneCommon.getFromEnv("AMOUNT", z.coerce.number().positive());

  const { client, validatorClient } = makeDefaultClientWithValidator(true);

  const walletPartyId = await validatorClient.getWalletPartyId();
  console.log(`Sending ${amount} CC from ${walletPartyId} to ${faLockingPartyId}`);

  const result = await client.sendAmulet(walletPartyId, faLockingPartyId, amount);

  console.log(`Transfer successful. updateId=${result.updateId}`);
}

main().catch((error: unknown) => {
  console.error(RedstoneCommon.stringifyError(error));
  process.exit(1);
});
