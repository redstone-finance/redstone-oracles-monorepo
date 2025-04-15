import { ContractParamsProviderMock } from "@redstone-finance/sdk";
import * as fs from "fs";
import path from "path";

export const SAMPLE_PACKAGES_TIMESTAMP = 1744563500000;
export const SAMPLE_PACKAGES_TIMESTAMP_NEWER = 1744563600000;

export const ETH_PRICE = 159504422175;
export const ETH_PRICE_NEWER = 159526674144;

export type SampleType = "default" | "newer" | "2-signatures";

export function testSample(type: SampleType) {
  switch (type) {
    case "default":
      return {
        timestamp: SAMPLE_PACKAGES_TIMESTAMP,
        price: ETH_PRICE,
        provider: new ContractParamsProviderMock(
          ["ETH"],
          path.join(__dirname, `sample-data/eth_primary_3sig.hex`),
          fs.readFileSync,
          3
        ),
      };
    case "newer":
      return {
        timestamp: SAMPLE_PACKAGES_TIMESTAMP_NEWER,
        price: ETH_PRICE_NEWER,
        provider: new ContractParamsProviderMock(
          ["ETH"],
          path.join(__dirname, `sample-data/eth_primary_3sig_newer.hex`),
          fs.readFileSync,
          3
        ),
      };
    case "2-signatures":
      return {
        timestamp: 0,
        price: 0,
        provider: new ContractParamsProviderMock(
          ["ETH"],
          path.join(__dirname, `sample-data/eth_primary_2sig.hex`),
          fs.readFileSync,
          2
        ),
      };
  }
}
