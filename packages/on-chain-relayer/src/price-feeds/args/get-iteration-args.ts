import { config } from "../../config";
import { fetchDataPackages } from "../../core/fetch-data-packages";
import { IContractFacade } from "../../facade/IContractFacade";
import { shouldUpdate } from "../should-update";

export const getIterationArgs = async (contractFacade: IContractFacade) => {
  const relayerConfig = config();
  const blockTag = await contractFacade.getBlockNumber();
  const uniqueSignersThreshold =
    await contractFacade.getUniqueSignersThresholdFromContract(blockTag);

  const dataPackages = await fetchDataPackages(
    relayerConfig,
    uniqueSignersThreshold
  );

  const dataFromContract = await contractFacade.getLastRoundParamsFromContract(
    blockTag,
    relayerConfig
  );

  const { shouldUpdatePrices, warningMessage } = await shouldUpdate(
    {
      dataPackages,
      dataFromContract,
      uniqueSignersThreshold,
    },
    relayerConfig
  );

  return {
    shouldUpdatePrices,
    message: warningMessage,
    args: {
      blockTag,
      fetchDataPackages: () =>
        fetchDataPackages(relayerConfig, uniqueSignersThreshold),
    },
  };
};
