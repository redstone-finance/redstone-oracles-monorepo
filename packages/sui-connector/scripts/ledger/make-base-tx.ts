import { Transaction } from "@mysten/sui/transactions";
import { SUI_TYPE_ARG } from "@mysten/sui/utils";
import { RedstoneCommon } from "@redstone-finance/utils";
import assert from "assert";
import { DEFAULT_GAS_BUDGET, makeSuiClient, SuiNetworkName, SuiNetworkSchema } from "../../src";

async function fetchCoinObjects(network: SuiNetworkName, senderAddress: string) {
  const { objects, hasNextPage } = await makeSuiClient(network).core.listCoins({
    owner: senderAddress,
    coinType: SUI_TYPE_ARG,
  });

  assert(!hasNextPage, "Too many coins");

  return objects;
}

export async function makeBaseTx(
  creator: (tx: Transaction, network: SuiNetworkName) => void,
  senderAddress: string
) {
  const network = RedstoneCommon.getFromEnv("NETWORK", SuiNetworkSchema);

  const tx = new Transaction();
  tx.setSender(senderAddress);
  tx.setGasBudget(DEFAULT_GAS_BUDGET);
  tx.setGasPayment(await fetchCoinObjects(network, senderAddress));
  creator(tx, network);

  return { network, tx };
}
