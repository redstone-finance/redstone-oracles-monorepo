import {
  RedstonePayload,
  SignedDataPackage,
  SignedDataPackagePlainObj,
} from "@redstone-finance/protocol";

const ethSignedDataPackagesObjects: (SignedDataPackagePlainObj & {
  dataServiceId: string;
  signerAddress: string;
})[] = [
  {
    dataPoints: [{ dataFeedId: "ETH", value: 1000 }],
    timestampMilliseconds: 1654353400000,
    signature:
      "NX5yd/Cs8HzVdNchrM59uOoSst7n9KK5Ou9pA6S5GTM0RwghGlFjA0S+SVfb85ipg4HzUTKATBZSqPXlWldEEhw=",
    dataServiceId: "service-1",
    dataPackageId: "ETH",
    signerAddress: "0x1",
  },
  {
    dataPoints: [{ dataFeedId: "ETH", value: 1000 }],
    timestampMilliseconds: 1654353400000,
    signature:
      "NX5yd/Cs8HzVdNchrM59uOoSst7n9KK5Ou9pA6S5GTM0RwghGlFjA0S+SVfb85ipg4HzUTKATBZSqPXlWldEEhw=",
    dataServiceId: "service-1",
    dataPackageId: "ETH",
    signerAddress: "0x2",
  },
  {
    dataPoints: [{ dataFeedId: "ETH", value: 990 }],
    timestampMilliseconds: 1654353400000,
    signature:
      "NX5yd/Cs8HzVdNchrM59uOoSst7n9KK5Ou9pA6S5GTM0RwghGlFjA0S+SVfb85ipg4HzUTKATBZSqPXlWldEEhw=",
    dataServiceId: "service-1",
    dataPackageId: "ETH",
    signerAddress: "0x2",
  },
  {
    dataPoints: [{ dataFeedId: "ETH", value: 1002 }],
    timestampMilliseconds: 1654353400000,
    signature:
      "NX5yd/Cs8HzVdNchrM59uOoSst7n9KK5Ou9pA6S5GTM0RwghGlFjA0S+SVfb85ipg4HzUTKATBZSqPXlWldEEhw=",
    dataServiceId: "service-1",
    dataPackageId: "ETH",
    signerAddress: "0x2",
  },
];

const btcSignedDataPackagesObjects: (SignedDataPackagePlainObj & {
  dataServiceId: string;
  signerAddress: string;
})[] = [
  {
    dataPoints: [{ dataFeedId: "BTC", value: 20000 }],
    timestampMilliseconds: 1654353400000,
    signature:
      "NX5yd/Cs8HzVdNchrM59uOoSst7n9KK5Ou9pA6S5GTM0RwghGlFjA0S+SVfb85ipg4HzUTKATBZSqPXlWldEEhw=",
    dataServiceId: "service-1",
    dataPackageId: "BTC",
    signerAddress: "0x1",
  },
  {
    dataPoints: [{ dataFeedId: "BTC", value: 20000 }],
    timestampMilliseconds: 1654353400000,
    signature:
      "NX5yd/Cs8HzVdNchrM59uOoSst7n9KK5Ou9pA6S5GTM0RwghGlFjA0S+SVfb85ipg4HzUTKATBZSqPXlWldEEhw=",
    dataServiceId: "service-1",
    dataPackageId: "BTC",
    signerAddress: "0x2",
  },
  {
    dataPoints: [{ dataFeedId: "BTC", value: 20000 }],
    timestampMilliseconds: 1654353400000,
    signature:
      "NX5yd/Cs8HzVdNchrM59uOoSst7n9KK5Ou9pA6S5GTM0RwghGlFjA0S+SVfb85ipg4HzUTKATBZSqPXlWldEEhw=",
    dataServiceId: "service-1",
    dataPackageId: "BTC",
    signerAddress: "0x2",
  },
  {
    dataPoints: [{ dataFeedId: "BTC", value: 20000 }],
    timestampMilliseconds: 1654353400000,
    signature:
      "NX5yd/Cs8HzVdNchrM59uOoSst7n9KK5Ou9pA6S5GTM0RwghGlFjA0S+SVfb85ipg4HzUTKATBZSqPXlWldEEhw=",
    dataServiceId: "service-1",
    dataPackageId: "BTC",
    signerAddress: "0x2",
  },
];

export const mockSignedDataPackages = {
  ETH: ethSignedDataPackagesObjects,
  BTC: btcSignedDataPackagesObjects,
};

export const mockSignedDataPackagesResponse = {
  ETH: ethSignedDataPackagesObjects.map(SignedDataPackage.fromObj),
  BTC: btcSignedDataPackagesObjects.map(SignedDataPackage.fromObj),
};

export const mockFastMediumPackages = ethSignedDataPackagesObjects
  .map((ethPackage, index) => {
    const btcPackage = btcSignedDataPackagesObjects[index];

    return {
      ...ethPackage,
      dataPoints: [...ethPackage.dataPoints, ...btcPackage.dataPoints],
      dataPackageId: `__FAST__`,
    };
  })
  .map(SignedDataPackage.fromObj);

export const mockPayload = RedstonePayload.prepare(
  Object.values(mockSignedDataPackagesResponse).flatMap((dataPackage) => dataPackage),
  ""
);
