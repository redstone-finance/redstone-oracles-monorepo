import {
  makeSuiDeployConfig,
  readIds,
  readSuiConfig,
  SuiAdapterContractOps,
  SuiNetworkName,
} from "../../src";
import { generateTransactionData } from "./generate-transaction-data";

void generateTransactionData((tx, network: SuiNetworkName) =>
  SuiAdapterContractOps.updateConfig(
    tx,
    { ...readSuiConfig(network), ...makeSuiDeployConfig() },
    readIds(network).adminCapId
  )
);
