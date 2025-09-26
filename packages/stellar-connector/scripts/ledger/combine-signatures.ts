import { RedstoneCommon } from "@redstone-finance/utils";
import { rpc } from "@stellar/stellar-sdk";
import { inspect } from "util";
import { makeServer } from "../utils";
import { deserializeTx } from "./deserialize-tx";

const signatures = [
  {
    signature:
      "ITNoTMIhtQD4k+V2zpLBCGY1DNQChTtJPyuUSGHJrjLGHoyXyybG9r0nNdlz12Ls4gTKR33CFk0r7D1oMRqVBA==",
    publicKey: "GBC3S4G7IIJITBEXSTQWKGPFQDTB5OQGMGPJMZNGQU6WQJ3UCV2A3DCE",
  },
];

export async function combineSignatures(
  envelopeRaw: string,
  signatures: { publicKey: string; signature: string }[]
) {
  const server = makeServer();
  const tx = await deserializeTx(envelopeRaw);

  for (const { publicKey, signature } of signatures) {
    tx.addSignature(publicKey, signature);
  }

  const transaction = await server.sendTransaction(tx);

  console.log(transaction);
  console.log(inspect(transaction, true, 100));

  const response = await RedstoneCommon.retry({
    fn: async () => {
      const response = await server.getTransaction(transaction.hash);
      if (response.status === rpc.Api.GetTransactionStatus.SUCCESS) {
        return response;
      }
      throw new Error(
        `Transaction did not succeed: ${transaction.hash}, status: ${response.status}`
      );
    },
    maxRetries: 10,
    waitBetweenMs: 1_000,
  })();

  console.dir(response, { depth: 0 });
}

void combineSignatures(
  "0000000200000000cc87252bd834c3bc5c3bd13491994866e7603b3ee32df2e20e8c5842d2e06e4000010a820004e55f000000030000000100000000000000000000000068b6bde10000000000000001000000000000001800000000000000016934c52a85a15a8a2a0e81dbf401f899b87bff54caa64b692c37a7adccdae0810000000c6368616e67655f61646d696e00000001000000120000000000000000d31a5cbf8351c36f1020558bebc79854355565846b5b9bf1793b61a3bf5bcb93000000010000000000000000000000016934c52a85a15a8a2a0e81dbf401f899b87bff54caa64b692c37a7adccdae0810000000c6368616e67655f61646d696e00000001000000120000000000000000d31a5cbf8351c36f1020558bebc79854355565846b5b9bf1793b61a3bf5bcb930000000000000001000000000000000100000007bd394afea1dad8e69b37c45b8808568e9462708ae1fc1a5d089471b052a7379a0000000100000006000000016934c52a85a15a8a2a0e81dbf401f899b87bff54caa64b692c37a7adccdae08100000014000000010021aec900000000000000a80000000000010a1e00000000",
  signatures
);
