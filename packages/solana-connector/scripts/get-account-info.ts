import { RedstoneCommon } from "@redstone-finance/utils";
import { Cluster, Connection, PublicKey } from "@solana/web3.js";
import { connectToCluster } from "../src";
import { balanceFromSol, balanceToSol } from "./utils";

async function maybeFundWithAirdrop(
  cluster: "devnet" | "testnet" | "mainnet-beta",
  connection: Connection,
  publicKey: PublicKey,
  balanceInSol: number = 2.5
) {
  if (cluster === "devnet" || cluster === "testnet") {
    console.log("Requesting airdrop...");
    try {
      const signature = await connection.requestAirdrop(publicKey, balanceFromSol(balanceInSol));
      // eslint-disable-next-line @typescript-eslint/no-deprecated -- add reason here, please
      await connection.confirmTransaction(signature, "confirmed");
      console.log("Airdrop successful!");
    } catch (error) {
      console.error("Airdrop failed with error:", RedstoneCommon.stringifyError(error));
    }
  }
}

export async function getAccountInfo(publicKey: PublicKey, cluster: Cluster) {
  const connection = connectToCluster(cluster);

  const accountInfo = await connection.getAccountInfo(publicKey);
  if (accountInfo) {
    const balance = await connection.getBalance(publicKey);
    console.log(`Account exists with balance: ${balanceToSol(balance)} SOL`);
  } else if (cluster === "devnet" || cluster === "testnet") {
    console.log("Account does not exist. Creating account...");
  } else {
    throw new Error("Account must be funded on mainnet. Please send SOL to this address.");
  }

  await maybeFundWithAirdrop(cluster, connection, publicKey);
}
