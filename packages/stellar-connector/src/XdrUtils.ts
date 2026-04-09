import { Address, rpc, scValToBigInt, scValToNative, StrKey, xdr } from "@stellar/stellar-sdk";

const PRICE_KEY = xdr.ScVal.scvSymbol("price");
const PACKAGE_TIMESTAMP_KEY = xdr.ScVal.scvSymbol("package_timestamp");
const WRITE_TIMESTAMP_KEY = xdr.ScVal.scvSymbol("write_timestamp");
const PRICE_DATA_KEY = xdr.ScVal.scvSymbol("price_data");

function expectValue<T>(val: T | null | undefined, name: string) {
  if (val === null || val === undefined) {
    throw new Error(`Expected ${name} to be defined.`);
  }

  return val;
}

export function ledgerKeyFromAddress(address: string) {
  const publicKeyBuffer = StrKey.decodeEd25519PublicKey(address);
  const accountIdXdr = xdr.PublicKey.publicKeyTypeEd25519(publicKeyBuffer);

  return xdr.LedgerKey.account(
    new xdr.LedgerKeyAccount({
      accountId: accountIdXdr,
    })
  );
}

export function accountFromResponse(response: rpc.Api.GetLedgerEntriesResponse) {
  if (response.entries.length === 0) {
    throw new Error("Empty response");
  }

  const entry = response.entries[0].val;

  if (entry.switch().name !== "account") {
    throw new Error("Unexpected response type");
  }

  return entry.account();
}

export function numbersToScvBytes(val: number[]) {
  return xdr.ScVal.scvBytes(Buffer.from(val));
}

export function stringToScVal(val: string) {
  return xdr.ScVal.scvString(val);
}

export function storageKeyFeed(feed: xdr.ScVal) {
  return xdr.ScVal.scvVec([xdr.ScVal.scvSymbol("Feed"), feed]);
}

export function bytesToScVal(val: Buffer) {
  return xdr.ScVal.scvBytes(val);
}

export function mapArrayToScVec<T>(array: T[], mapFn: (val: T) => xdr.ScVal) {
  return xdr.ScVal.scvVec(array.map(mapFn));
}

export function addressToScVal(address: string) {
  return xdr.ScVal.scvAddress(new Address(address).toScAddress());
}

export function parseSimValAs<T>(
  sim: rpc.Api.SimulateTransactionSuccessResponse,
  parseFn: (val: xdr.ScVal) => T
) {
  const retVal = expectValue(sim.result, "simulationResult").retval;

  return parseFn(retVal);
}

export function parseReadPriceAndTimestampSimulation(
  sim: rpc.Api.SimulateTransactionSuccessResponse
) {
  return parseSimValAs(sim, (val) => {
    const vec = expectValue<xdr.ScVal[]>(val.vec(), "simRetValAsVec");

    return parsePriceAndTimestamp(vec);
  });
}

export function parseGetPricesSimulation(sim: rpc.Api.SimulateTransactionSuccessResponse) {
  return parseSimValAs(sim, (val) => {
    const vec = expectValue<xdr.ScVal[]>(val.vec(), "simRetValAsVec");

    return parseGetPrices(vec);
  });
}

export function parseReadSinglePriceDataSimulation(
  sim: rpc.Api.SimulateTransactionSuccessResponse
) {
  return parseSimValAs(sim, (val) => {
    const map = expectValue(val.map(), "simRetValAsMap");

    return lastRoundDetailsFromXdrMap(map);
  });
}

export function parsePrimitiveFromSimulation<P>(
  sim: rpc.Api.SimulateTransactionSuccessResponse,
  transform: (val: unknown) => P
) {
  return parseSimValAs(sim, (val) => transform(scValToNative(val)));
}

export function parseBigIntFromSimulation(sim: rpc.Api.SimulateTransactionSuccessResponse) {
  return parseSimValAs(sim, (val) => scValToBigInt(val));
}

export function parsePriceDataFromContractDataLegacy(result: rpc.Api.LedgerEntryResult) {
  const map = expectValue(result.val.contractData().val().map(), "contract data as map");

  return lastRoundDetailsFromXdrMap(map);
}

export function maybeParsePriceDataFromContractDataLegacy(result: rpc.Api.LedgerEntryResult) {
  try {
    return parsePriceDataFromContractDataLegacy(result);
  } catch {
    return undefined;
  }
}

export function parsePriceDataStorageFromContractData(result: rpc.Api.LedgerEntryResult) {
  const map = expectValue(result.val.contractData().val().map(), "contract data as map");
  const priceDatasEntry = expectValue(findVal(map, PRICE_DATA_KEY), "price_datas in storage map");
  const priceDatasVec = expectValue(priceDatasEntry.val().vec(), "price_datas as vec");

  return priceDatasVec.map((entry) => {
    const entryMap = expectValue(entry.map(), "price data entry as map");

    return lastRoundDetailsFromXdrMap(entryMap);
  });
}

export function parsePriceDataFromContractData(result: rpc.Api.LedgerEntryResult) {
  const entries = parsePriceDataStorageFromContractData(result);

  if (entries.length === 0) {
    throw new Error("Empty PriceDataStorage");
  }

  return entries[entries.length - 1];
}

export function maybeParsePriceDataFromContractData(result: rpc.Api.LedgerEntryResult) {
  try {
    return parsePriceDataFromContractData(result);
  } catch {
    return undefined;
  }
}

export function lastRoundDetailsFromXdrMap(map: xdr.ScMapEntry[]) {
  const price = scValToBigInt(expectValue(findVal(map, PRICE_KEY), "PRICE_KEY in map").val());

  const packageTimestamp = Number(
    scValToNative(
      expectValue(findVal(map, PACKAGE_TIMESTAMP_KEY), "PACKAGE_TIMESTAMP_KEY in map").val()
    )
  );
  const writeTimestamp = Number(
    scValToNative(
      expectValue(findVal(map, WRITE_TIMESTAMP_KEY), "WRITE_TIMESTAMP_KEY in map").val()
    )
  );

  return {
    lastDataPackageTimestampMS: packageTimestamp,
    lastBlockTimestampMS: writeTimestamp,
    lastValue: price,
  };
}

export function findVal(map: xdr.ScMapEntry[], key: xdr.ScVal) {
  return map.find((entry) => entry.key().toXDR().equals(key.toXDR()));
}

export function parsePriceAndTimestamp(values: xdr.ScVal[]) {
  const value = scValToBigInt(values[0]);
  const timestamp = Number(scValToNative(values[1]));

  if (Number.isNaN(timestamp)) {
    throw new Error("Unexpected type");
  }

  return {
    value,
    timestamp,
  };
}

export function parseGetPrices(values: xdr.ScVal[]) {
  const timestamp = Number(scValToNative(values[0]));
  const prices = expectValue(values[1].vec(), "PricesAsVec").map(scValToBigInt);

  return {
    timestamp,
    prices,
  };
}
