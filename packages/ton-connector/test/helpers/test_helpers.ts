import { BigNumber } from "@ethersproject/bignumber";
import { arrayify, hexlify } from "@ethersproject/bytes";
import { RedstonePayload } from "@redstone-finance/protocol";
import {
  ContractParamsProvider,
  ContractParamsProviderMock,
  getSignersForDataServiceId,
} from "@redstone-finance/sdk";
import { MathUtils, RedstoneCommon } from "@redstone-finance/utils";
import { compile } from "@ton/blueprint";
import fs from "fs";
import path from "path";
import { createTestNetwork } from "./sandbox_helpers";

export const DATA_PACKAGE_DATA_1 =
  "4554480000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000248b3142440186b75caeb000000020000001";
export const DATA_PACKAGE_DATA_2 =
  "4554480000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000248c3218dc0186b75c87a000000020000001";
export const TON_MAX_UINT =
  115792089237316195423570985008687907853269984665640564039457584007913129639935n;

// there are 2 package timestamps in the file: 1678113540 and 1678113550
export const SAMPLE_PACKAGES_TIMESTAMP = 1678113540;
export const ETH_BIG_NUMBER = 4543560n;

export const SIGNERS = [
  "0x8BB8F32Df04c8b654987DAaeD53D6B6091e3B774",
  "0xdEB22f54738d54976C4c0fe5ce6d408E40d88499",
  "0x51Ce04Be4b3E32572C4Ec9135221d0691Ba7d202",
  "0xDD682daEC5A90dD295d14DA4b0bec9281017b5bE",
  "0x9c5AE89C4Af6aA32cE58588DBaF90d18a855B6de",
];

export async function createTesterContractEnv(name: string) {
  const testerCode = await compile(name);
  const network = await createTestNetwork();

  return { network, testerCode };
}

export function createContractParamsProviderMock(
  dataFeeds: string[],
  filename: string = "2sig_ETH_BTC"
) {
  const filePath = path.join(__dirname, `../sample-data/${filename}.hex`);

  return new ContractParamsProviderMock(dataFeeds, filePath, fs.readFileSync);
}

export function getContractParamsProvider(dataFeeds = ["ETH", "BTC", "AVAX", "USDT"]) {
  return new ContractParamsProvider({
    dataServiceId: "redstone-primary-prod",
    uniqueSignersCount: 4,
    dataPackagesIds: dataFeeds,
    authorizedSigners: getSignersForDataServiceId("redstone-primary-prod"),
  });
}

export function expectUsdtPrice(price: bigint) {
  expect(Number(price)).toBeLessThanOrEqual(10 ** 8 * 1.02);
  expect(Number(price)).toBeGreaterThanOrEqual(10 ** 8 * 0.98);
}

export async function waitForNewPayload(
  paramsProvider: ContractParamsProvider,
  previousTimestamp: number,
  previousMedian: number
) {
  await RedstoneCommon.sleep(5000);
  await RedstoneCommon.waitForSuccess(
    async () => {
      const { median, timestamp } = getMedianAndTimestamp(await paramsProvider.getPayloadHex(true));

      console.log(`${median} ${previousMedian} ${timestamp} ${previousTimestamp}`);

      return previousMedian !== median && previousTimestamp !== timestamp;
    },
    11,
    "New data not found."
  );
}

function getMedianAndTimestamp(payloadHex: string) {
  const payload = RedstonePayload.parse(arrayify(payloadHex));

  return {
    median: MathUtils.getMedian(
      payload.signedDataPackages[0].dataPackage.dataPoints.map((dp) =>
        BigNumber.from(hexlify(dp.value)).toNumber()
      )
    ),
    timestamp: payload.signedDataPackages[0].dataPackage.timestampMilliseconds,
  };
}
