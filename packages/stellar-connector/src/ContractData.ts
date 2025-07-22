import { scValToBigInt, scValToNative, xdr } from "@stellar/stellar-sdk";

const PRICE_KEY = xdr.ScVal.scvSymbol("price").toXDR();
const PACKAGE_TIMESTAMP_KEY = xdr.ScVal.scvSymbol("package_timestamp").toXDR();
const WRITE_TIMESTAMP_KEY = xdr.ScVal.scvSymbol("write_timestamp").toXDR();

export function lastRoundDetailsFromXdrMap(map: xdr.ScMapEntry[]) {
  const price = scValToBigInt(findVal(map, PRICE_KEY)!.val());
  const packageTimestamp = Number(
    scValToNative(findVal(map, PACKAGE_TIMESTAMP_KEY)!.val())
  );
  const writeTimestamp = Number(
    scValToNative(findVal(map, WRITE_TIMESTAMP_KEY)!.val())
  );

  return {
    lastDataPackageTimestampMS: writeTimestamp,
    lastBlockTimestampMS: packageTimestamp,
    lastValue: price,
  };
}

export function parseReturnValue(values: xdr.ScVal[]) {
  const timestamp = Number(scValToNative(values[0]));
  const prices = values[1].vec()!.map(scValToBigInt);

  return {
    timestamp,
    prices,
  };
}

function findVal(map: xdr.ScMapEntry[], key: Buffer) {
  return map.find((entry) => entry.key().toXDR().equals(key));
}
