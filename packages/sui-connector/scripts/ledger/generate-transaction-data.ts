import { toBase64 } from "@mysten/bcs";
import { Transaction } from "@mysten/sui/transactions";
import "dotenv/config";
import { makeSuiClient, SuiNetworkName } from "../../src";
import { MULTI_SIG_ADDRESS } from "./const";
import { makeBaseTx } from "./make-base-tx";

export async function generateTransactionData(
  creator: (tx: Transaction, network: SuiNetworkName) => void,
  multiSigAddress = MULTI_SIG_ADDRESS
) {
  const { network, tx } = await makeBaseTx(creator, multiSigAddress);

  const encodedTransaction = toBase64(
    await tx.build({ client: makeSuiClient(network) })
  );
  console.log(encodedTransaction);

  return encodedTransaction;
}
