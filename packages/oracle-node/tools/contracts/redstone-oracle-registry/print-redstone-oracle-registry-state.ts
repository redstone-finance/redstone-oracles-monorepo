import ArweaveService from "../../../src/arweave/ArweaveService";
import niceLogger from "../../../src/utils/nice-logger";

export const printRedstoneOracleRegistryState = async () => {
  const arweaveService = new ArweaveService();
  const state = await arweaveService.getOracleRegistryContractState();
  niceLogger.log(state);
};
