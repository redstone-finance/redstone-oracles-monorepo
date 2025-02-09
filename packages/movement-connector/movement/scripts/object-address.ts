import { AccountAddress, createObjectAddress } from "@aptos-labs/ts-sdk";
import { SEED } from "../../src/MovementPricesContractAdapter";

function main() {
  const scriptArgs = process.argv.slice(2);
  const creatorAddress = scriptArgs[0];

  if (!creatorAddress) {
    throw new Error(
      `Please provide account address as an argument to this command.`
    );
  }

  console.log(
    createObjectAddress(
      AccountAddress.fromString(creatorAddress),
      SEED
    ).toString()
  );
}

void main();
