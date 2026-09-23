import { makeSuiDeployConfig, SuiAdapterContractOps, SuiNetworkName } from "../../src";
import { readIds, readSuiConfig } from "../deployment-config";
import { generateTransactionData } from "./generate-transaction-data";

void generateTransactionData((tx, network: SuiNetworkName) =>
  SuiAdapterContractOps.updateConfig(
    tx,
    { ...readSuiConfig(network), ...makeSuiDeployConfig() },
    readIds(network).adminCapId
  )
);
