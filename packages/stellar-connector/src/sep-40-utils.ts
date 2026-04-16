import { Address, nativeToScVal, rpc, scValToNative, xdr } from "@stellar/stellar-sdk";

export type Asset = { tag: "Stellar"; address: Address } | { tag: "Other"; symbol: string };

export function feedMappingsToScVal(mappings: { feed: string; asset: Asset }[]) {
  return xdr.ScVal.scvVec(
    mappings.map((m) =>
      xdr.ScVal.scvVec([nativeToScVal(m.feed, { type: "string" }), assetToScVal(m.asset)])
    )
  );
}

export function assetToScVal(asset: Asset) {
  if (asset.tag === "Stellar") {
    return xdr.ScVal.scvVec([xdr.ScVal.scvSymbol("Stellar"), asset.address.toScVal()]);
  }

  return xdr.ScVal.scvVec([xdr.ScVal.scvSymbol("Other"), xdr.ScVal.scvSymbol(asset.symbol)]);
}

export function parseAsset(val: xdr.ScVal): Asset {
  const vec = val.vec()!;
  const tag = vec[0].sym().toString();

  if (tag === "Stellar") {
    return { tag: "Stellar", address: Address.fromScVal(vec[1]) };
  }

  return { tag: "Other", symbol: vec[1].sym().toString() };
}

function parsePriceData(val: xdr.ScVal) {
  const fields = val.map()!;
  const obj: Record<string, xdr.ScVal> = {};
  for (const entry of fields) {
    obj[entry.key().sym().toString()] = entry.val();
  }

  return {
    price: scValToNative(obj["price"]) as bigint,
    timestamp: Number(scValToNative(obj["timestamp"])),
  };
}

export function getReturnValue(sim: rpc.Api.SimulateTransactionSuccessResponse): xdr.ScVal {
  return sim.result!.retval;
}

export function parseOptionalPriceData(sim: rpc.Api.SimulateTransactionSuccessResponse) {
  const retval = getReturnValue(sim);

  if (retval.switch().name === "scvVoid") {
    return undefined;
  }

  return parsePriceData(retval);
}

export function parseOptionalPriceDataVec(sim: rpc.Api.SimulateTransactionSuccessResponse) {
  const retval = getReturnValue(sim);

  if (retval.switch().name === "scvVoid") {
    return undefined;
  }

  return retval.vec()!.map(parsePriceData);
}
