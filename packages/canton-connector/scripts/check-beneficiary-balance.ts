import { RedstoneCommon } from "@redstone-finance/utils";
import Decimal from "decimal.js";
import "dotenv/config";
import * as AllDefs from "../src/canton-defs.json";
import { makeDefaultClient, makeValidatorClient, readNetwork } from "./utils";

const BENEFICIARY_BALANCE_LIMIT = 100000;

/**
 * Checks the balance of the beneficiary wallet and transfers excess funds to źródełko
 * if the balance exceeds the defined limit.
 */
async function main() {
  const network = readNetwork();
  const { walletPartyId, zrodelkoPartyId } = AllDefs[network].node as {
    walletPartyId: string;
    zrodelkoPartyId: string;
  };

  const client = makeDefaultClient();
  const beneficiaryBalanceStr = await client.getAmuletBalance(walletPartyId);
  const beneficiaryBalance = new Decimal(beneficiaryBalanceStr);

  if (beneficiaryBalance.lte(BENEFICIARY_BALANCE_LIMIT)) {
    console.log(
      `Beneficiary balance (${beneficiaryBalance.toString()} CC) is within the limit (${BENEFICIARY_BALANCE_LIMIT} CC). No transfer needed.`
    );
    return;
  }
  console.log(
    `Beneficiary balance (${beneficiaryBalance.toString()} CC) exceeds the limit (${BENEFICIARY_BALANCE_LIMIT} CC). `
  );

  const transferAmount = beneficiaryBalance.minus(BENEFICIARY_BALANCE_LIMIT / 2).toNumber();
  console.log(`Transferring ${transferAmount} CC from ${walletPartyId} to ${zrodelkoPartyId}...`);

  const validatorClient = makeValidatorClient();
  const result = await validatorClient.sendCC(zrodelkoPartyId, transferAmount);
  if (result.status === "success") {
    console.log(`Transfer successful: ${String(result.amount)} CC sent to ${zrodelkoPartyId}`);
  } else {
    console.error(`Transfer failed: ${String(result.error)}`);
  }
}

main().catch((error: unknown) => {
  console.error(RedstoneCommon.stringifyError(error));
  process.exit(1);
});
