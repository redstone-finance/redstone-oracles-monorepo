import { Account, Aptos } from "@aptos-labs/ts-sdk";
import "dotenv/config";
import prompts from "prompts";
import { makeAptosAccount, OCTAS_PER_MOVE } from "../src";
import { getCurrencySymbol, makeAptos, signAndSubmit } from "./utils";

async function transferCoins(
  aptos: Aptos,
  sender: Account,
  recipientAddress: string,
  amount: bigint,
  currencySymbol: string
) {
  try {
    console.log(`🚀 Sending ${currencySymbol} to recipient...`);
    const transaction = await aptos.transferCoinTransaction({
      sender: sender.accountAddress,
      recipient: recipientAddress,
      amount,
    });
    const response = await signAndSubmit(aptos, transaction, sender);

    await aptos.waitForTransaction({
      transactionHash: response.hash,
    });

    console.log(`🎉 Transfer successful!`);
  } catch (error) {
    console.error("❌ Error sending:", error);
  }
}

async function ensureRecipientCanReceive(
  aptos: Aptos,
  sender: Account,
  recipientAddress: string,
  currencySymbol: string
) {
  try {
    console.log(`🔍 Checking if recipient has registered ${currencySymbol}...`);
    const resources = await aptos.getAccountResources({
      accountAddress: recipientAddress,
    });

    const hasAptosCoinStore = resources.some(
      (r) => r.type === "0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>"
    );

    if (!hasAptosCoinStore) {
      console.log(
        `⚠️ Recipient has NOT registered ${currencySymbol}. Registering now...`
      );

      const transaction = await aptos.transaction.build.simple({
        sender: sender.accountAddress,
        data: {
          function: "0x1::coin::register",
          typeArguments: ["0x1::aptos_coin::AptosCoin"],
          functionArguments: [],
        },
      });
      const response = await signAndSubmit(aptos, transaction, sender);
      await aptos.waitForTransaction({ transactionHash: response.hash });

      console.log(
        `✅ Recipient registered for ${currencySymbol} successfully!`
      );
    } else {
      console.log(`✅ Recipient is already registered for ${currencySymbol}.`);
    }
  } catch (error) {
    console.error("❌ Error checking or registering recipient:", error);
  }
}

async function ensureRecipientAccountExists(
  aptos: Aptos,
  sender: Account,
  recipientAddress: string
) {
  try {
    console.log(`🔍 Checking if account ${recipientAddress} exists...`);

    // Check if the recipient account exists
    await aptos.getAccountInfo({ accountAddress: recipientAddress });

    console.log("✅ Account already exists. Skipping creation.");
  } catch (error) {
    if ((error as Error).message.includes("account_not_found")) {
      console.log("🚀 Creating account for recipient...");

      const transaction = await aptos.transaction.build.simple({
        sender: sender.accountAddress,
        data: {
          function: "0x1::aptos_account::create_account",
          typeArguments: [],
          functionArguments: [recipientAddress],
        },
      });

      const response = await signAndSubmit(aptos, transaction, sender);

      await aptos.waitForTransaction({
        transactionHash: response.hash,
      });

      console.log(`🎉 Account created!`);
    } else {
      console.error("❌ Error checking account:", error);
    }
  }
}

async function getBalance(aptos: Aptos, sender: Account) {
  return (
    Number(
      await aptos.account.getAccountAPTAmount({
        accountAddress: sender.accountAddress,
      })
    ) / OCTAS_PER_MOVE
  );
}

async function getTransferDetails() {
  const response = await prompts(
    [
      {
        type: "text",
        name: "recipient",
        message: "Enter recipient address:",
        validate: (value: string) =>
          value.startsWith("0x") || "Address must start with 0x",
      },
      {
        type: "text", // Changed from "number" to "text" to allow decimals
        name: "amount",
        message: "Enter amount (MOVE):",
        initial: "0.1",
        validate: (value: string) => {
          const num = parseFloat(value);
          return !isNaN(num) && num > 0
            ? true
            : "Amount must be a valid number greater than 0";
        },
        format: (value: string) => parseFloat(value), // Ensure it's converted to a number
      },
    ],
    {
      onCancel: () => {
        console.log("\n❌ Operation aborted by user.");
        process.exit(1);
      },
    }
  );

  return response as { recipient: string; amount: number };
}

async function main() {
  const aptos = makeAptos();
  const sender = makeAptosAccount();

  const currencySymbol = getCurrencySymbol();

  console.log(`💸 Sending from: ${sender.accountAddress.toString()}`);
  console.log(
    `💰 Current balance: ${await getBalance(aptos, sender)} ${currencySymbol}`
  );

  const { recipient: recipientAddress, amount } = await getTransferDetails();

  await ensureRecipientAccountExists(aptos, sender, recipientAddress);
  await ensureRecipientCanReceive(
    aptos,
    sender,
    recipientAddress,
    currencySymbol
  );
  await transferCoins(
    aptos,
    sender,
    recipientAddress,
    BigInt(amount * OCTAS_PER_MOVE),
    currencySymbol
  );
}

void main();
