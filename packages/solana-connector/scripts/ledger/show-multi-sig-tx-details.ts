import "dotenv/config";
import { makeConnection } from "../utils";
import { SQUAD_ADDRESS } from "./config";
import { SquadsMultisig } from "./multi-sig-utils";

const TX_IDX = 2;

export async function main() {
  const connection = makeConnection();

  const squadUtils = new SquadsMultisig(SQUAD_ADDRESS, connection);

  const txInfo = await squadUtils.txInfo(TX_IDX);

  console.log(txInfo);
  console.log(`Account Keys:`, txInfo.message.accountKeys);
  console.log(`Instructions: `, txInfo.message.instructions);
}

void main();
