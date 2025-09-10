import { DataPackagesWrapper } from "@redstone-finance/evm-connector";
import {
  DataServiceIds,
  getDataPackagesTimestamp,
  getSignersForDataServiceId,
  requestDataPackages,
} from "@redstone-finance/sdk";
import { Adapter } from "erc7412";
import { decodeAbiParameters, encodeAbiParameters, type Address, type Hex } from "viem";

const MAX_TIMESTAMP_DEVIATION = 180_000;

export class RedstoneAdapter implements Adapter {
  getOracleId(): string {
    return "REDSTONE";
  }

  async fetchOffchainData(_client: unknown, _requester: Address, data: Hex): Promise<Hex> {
    const [feedId, uniqueSignersCount, dataServiceId] = decodeAbiParameters(
      [{ type: "bytes32" }, { type: "uint8" }, { type: "string" }],
      data
    ) as [string, number, string];

    const dataPackages = await requestDataPackages({
      dataPackagesIds: [bytes32ToString(feedId)],
      dataServiceId,
      uniqueSignersCount,
      maxTimestampDeviationMS: MAX_TIMESTAMP_DEVIATION,
      authorizedSigners: getSignersForDataServiceId(dataServiceId as DataServiceIds),
    });

    const signedRedstonePayload = await new DataPackagesWrapper(
      dataPackages
    ).prepareRedstonePayload(true);

    const dataTimestamp = BigInt(getDataPackagesTimestamp(dataPackages));
    const encodedDataTimestamp = encodeAbiParameters([{ type: "uint256" }], [dataTimestamp]);

    return `${encodedDataTimestamp}${signedRedstonePayload}`;
  }
}

const bytes32ToString = (bytes32: string) => {
  const arrayOfChars = bytes32.slice(2).split("");

  while (arrayOfChars[arrayOfChars.length - 2] === "0") {
    arrayOfChars.pop();
  }

  return Buffer.from(arrayOfChars.join(""), "hex").toString();
};
