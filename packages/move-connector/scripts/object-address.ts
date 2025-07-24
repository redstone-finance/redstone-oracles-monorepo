import { AccountAddress } from "@aptos-labs/ts-sdk";
import {
  getPriceAdapterObjectAddress,
  objectAddressForDeployment,
} from "./deploy-utils";
import { makeAptos } from "./utils";

function isObjectAddressQuery(args: string[]) {
  return args.length == 2 && args[1] == "--object-address";
}

async function main() {
  const scriptArgs = process.argv.slice(2);
  const creatorAddress = AccountAddress.fromString(scriptArgs[0]);
  if (isObjectAddressQuery(scriptArgs)) {
    console.log(
      (await objectAddressForDeployment(makeAptos(), creatorAddress)).toString()
    );
  } else {
    console.log(getPriceAdapterObjectAddress(creatorAddress).toString());
  }
}

void main();
