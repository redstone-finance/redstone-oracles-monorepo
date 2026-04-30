import { RedstoneCommon } from "@redstone-finance/utils";

export enum PackagesTypes {
  DataPackage = "data-package",
  HyperLiquidHIP3Package = "hl-hip3-package",
}

export type DataPackageTopic = {
  dataServiceId: string;
  dataPackageId: string;
  nodeAddress: string;
};

export type HLPackageTopic = {
  dataServiceId: string;
  dexId: string;
  nodeAddress: string;
};

// matters only for subscribe
// 100 req/s is mqtt limit per connection
// 1 topic(dataFeedId,signer) produces => 3 (main,fallback,fast) feed per second
// prod: 30 feeds x 5 signers => 5 connections
// dev: 30 feeds x 2 signers => 2 connections
export function calculateTopicCountPerConnection(): number {
  return Math.floor(100 / 3);
}

export function encodeHLPackageTopic({ dataServiceId, dexId, nodeAddress }: HLPackageTopic) {
  return encodeTopic([PackagesTypes.HyperLiquidHIP3Package, dataServiceId, dexId, nodeAddress]);
}

export function decodeHLPackageTopic(encodedTopic: string): HLPackageTopic {
  const [packageType, dataServiceId, dexId, nodeAddress] = decodeTopic(encodedTopic);

  RedstoneCommon.assert(
    packageType === PackagesTypes.HyperLiquidHIP3Package.toString(),
    `Expected packageType == hl-hip3-package received ${packageType}`
  );

  return {
    dataServiceId,
    dexId,
    nodeAddress,
  };
}

export function encodeDataPackageTopic({
  dataServiceId,
  dataPackageId,
  nodeAddress,
}: DataPackageTopic) {
  return encodeTopic([PackagesTypes.DataPackage, dataServiceId, dataPackageId, nodeAddress]);
}

export function encodeLegacyDataPackageTopic({
  dataServiceId,
  dataPackageId,
  nodeAddress,
}: DataPackageTopic) {
  const parts = [PackagesTypes.DataPackage, dataServiceId, dataPackageId, nodeAddress];
  return parts.map((part) => (WILDCARDS.has(part) ? part : encodeURIComponent(part))).join("/");
}

export function decodeDataPackageTopic(encodedTopic: string): DataPackageTopic {
  const [packageType, dataServiceId, dataPackageId, nodeAddress] = decodeTopic(encodedTopic);

  RedstoneCommon.assert(
    packageType === PackagesTypes.DataPackage.toString(),
    `Expected packageType == data-package received ${packageType}`
  );

  return {
    dataServiceId,
    dataPackageId,
    nodeAddress,
  };
}

// MQTT wildcards: + (single-level), # (multi-level)
// NATS wildcards: * (single-token), > (multi-token)
const WILDCARDS = new Set(["+", "#", "*", ">"]);

// '/' is the topic separator — a part containing it cannot round-trip through
// split("/") after decoding, so we reject it at the source.
// '.' is the NATS subject separator — encodeURIComponent leaves it unencoded,
// so we encode it explicitly to survive the MQTT↔NATS conversion.
const encodePart = (part: string) => {
  return encodeURIComponent(part).replace(/\./g, "%2E");
};

export const encodeTopic = (parts: string[]) => {
  const encodedParts = [];

  let index = 0;
  for (const part of parts) {
    if (WILDCARDS.has(part)) {
      encodedParts.push(part);
    } else if (part.startsWith("$") && index === 0) {
      encodedParts.push(part);
    } else {
      encodedParts.push(encodePart(part));
    }
    index++;
  }

  return encodedParts.join("/");
};

export const decodeTopic = (topic: string): string[] => {
  const parts = [];
  const encodedParts = topic.split("/");

  let index = 0;
  for (const encodedPart of encodedParts) {
    if (WILDCARDS.has(encodedPart)) {
      parts.push(encodedPart);
    } else if (encodedPart.startsWith("$") && index === 0) {
      parts.push(encodedPart);
    } else {
      parts.push(decodeURIComponent(encodedPart));
    }
    index++;
  }

  return parts;
};
