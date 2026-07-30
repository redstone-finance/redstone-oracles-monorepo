import { IRedstoneAdapter } from "../../../typechain-types";

export type LastRoundTimestamps = {
  lastDataPackageTimestampMS: number;
  lastBlockTimestampMS: number;
};

export const getLatestTimestampsFromContract = async (
  adapterContract: IRedstoneAdapter,
  blockTag?: number
): Promise<LastRoundTimestamps> => {
  const timestamps = await adapterContract.callStatic.getTimestampsFromLatestUpdate({
    blockTag,
  });

  return {
    lastDataPackageTimestampMS: timestamps.dataTimestamp.toNumber(),
    lastBlockTimestampMS: timestamps.blockTimestamp.toNumber() * 1000,
  };
};
