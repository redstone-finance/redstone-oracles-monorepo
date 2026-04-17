import { RedstoneCommon } from "@redstone-finance/utils";
import { Address, nativeToScVal, xdr } from "@stellar/stellar-sdk";

const STELLAR_ASSET = "Stellar" as const;
const OTHER_ASSET = "Other" as const;

export type Sep40Asset =
  | { tag: typeof STELLAR_ASSET; address: Address }
  | { tag: typeof OTHER_ASSET; symbol: string };

export function assetToScVal(asset: Sep40Asset) {
  switch (asset.tag) {
    case STELLAR_ASSET:
      return xdr.ScVal.scvVec([xdr.ScVal.scvSymbol(STELLAR_ASSET), asset.address.toScVal()]);
    case OTHER_ASSET:
      return xdr.ScVal.scvVec([
        xdr.ScVal.scvSymbol(OTHER_ASSET),
        xdr.ScVal.scvSymbol(asset.symbol),
      ]);
    default:
      RedstoneCommon.throwUnsupportedParamError(asset);
  }
}

export function parseAsset(retVal: unknown): Sep40Asset {
  const [tag, value] = retVal as [string, unknown];

  switch (tag) {
    case STELLAR_ASSET:
      return { tag, address: Address.fromString(value as string) };
    default:
      return { tag: OTHER_ASSET, symbol: value as string };
  }
}

export function parseAssets(retVal: unknown) {
  return (retVal as unknown[]).map(parseAsset);
}

export function assetLabelFor(asset: Sep40Asset) {
  return asset.tag === "Stellar" ? asset.address.toString() : asset.symbol;
}

export function feedMappingsToScVal(
  mappings: { feed: string; asset: Sep40Asset; decimals?: number }[]
) {
  return xdr.ScVal.scvVec(
    mappings.map((m) =>
      xdr.ScVal.scvMap([
        new xdr.ScMapEntry({
          key: xdr.ScVal.scvSymbol("asset"),
          val: assetToScVal(m.asset),
        }),
        new xdr.ScMapEntry({
          key: xdr.ScVal.scvSymbol("decimals"),
          val:
            m.decimals === undefined
              ? xdr.ScVal.scvVoid()
              : nativeToScVal(m.decimals, { type: "u32" }),
        }),
        new xdr.ScMapEntry({
          key: xdr.ScVal.scvSymbol("feed"),
          val: nativeToScVal(m.feed, { type: "string" }),
        }),
      ])
    )
  );
}

function parseSep40PriceData(retVal: unknown) {
  const { price, timestamp } = retVal as { price: bigint; timestamp: bigint };

  return { price, timestamp: Number(timestamp) };
}

export function parseOptionalPriceData(retVal: unknown) {
  if (!RedstoneCommon.isDefined(retVal)) {
    return undefined;
  }

  return parseSep40PriceData(retVal);
}

export function parseOptionalPriceDataVec(retVal: unknown) {
  if (!RedstoneCommon.isDefined(retVal)) {
    return undefined;
  }

  return (retVal as unknown[]).map(parseSep40PriceData);
}
