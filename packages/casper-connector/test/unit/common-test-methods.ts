import { RuntimeArgs } from "casper-js-sdk";
import {
  PriceAdapterCasperContractAdapter,
  PriceRelayAdapterCasperContractAdapter,
} from "../../src";
import { ICasperConnection } from "../../src/casper/ICasperConnection";
import { decodeHex, decodeStringCLList } from "../../src/casper/utils";
import { CasperContractAdapter } from "../../src/contracts/CasperContractAdapter";
import {
  ARG_NAME_FEED_IDS,
  ARG_NAME_PAYLOAD,
  ENTRY_POINT_WRITE_PRICES,
  STORAGE_KEY_TIMESTAMP,
  STORAGE_KEY_VALUES,
} from "../../src/contracts/constants";
import {
  MOCK_PAYLOAD_HASH,
  MOCK_PAYLOAD_HEX,
  callEntrypointMock,
  contractDataMock,
  contractDictionaryMock,
  makeContractParamsProviderMock,
  u256Value,
} from "../mock-utils";

export async function testReadPricesFromContract(
  connection: jest.Mocked<ICasperConnection>,
  adapter: PriceAdapterCasperContractAdapter,
  wrappedAdapter: CasperContractAdapter
) {
  connection.queryContractDictionary
    .mockImplementationOnce(
      contractDictionaryMock(wrappedAdapter, STORAGE_KEY_VALUES, "ETH", u256Value(12345))
    )
    .mockImplementationOnce(
      contractDictionaryMock(wrappedAdapter, STORAGE_KEY_VALUES, "BTC", u256Value(54321))
    );

  const values = await adapter.readPricesFromContract(makeContractParamsProviderMock());
  expect(values).toStrictEqual([12345n, 54321n]);
}

export async function testReadTimestampFromContract(
  connection: jest.Mocked<ICasperConnection>,
  adapter: PriceAdapterCasperContractAdapter,
  wrappedAdapter: CasperContractAdapter
) {
  connection.queryContractData.mockImplementationOnce(
    contractDataMock(wrappedAdapter, STORAGE_KEY_TIMESTAMP, u256Value(2233))
  );

  const timestamp = await adapter.readTimestampFromContract();
  expect(timestamp).toEqual(2233);
}

export async function testWriteProcessFromPayloadToContract(
  connection: jest.Mocked<ICasperConnection>,
  adapter: PriceAdapterCasperContractAdapter
) {
  connection.callEntrypoint.mockImplementationOnce(
    callEntrypointMock(adapter, ENTRY_POINT_WRITE_PRICES, 0, checkPayloadRuntimeArgs())
  );

  const deployId = await adapter.writePricesFromPayloadToContract(makeContractParamsProviderMock());
  expect(deployId).toEqual("OK");
}

export function checkPayloadRuntimeArgs(expectedPayload = MOCK_PAYLOAD_HEX) {
  return (runtimeArgs: RuntimeArgs) => {
    const feedIds = decodeStringCLList(runtimeArgs.args.get(ARG_NAME_FEED_IDS));
    const payload = decodeHex(runtimeArgs.args.get(ARG_NAME_PAYLOAD));

    expect(feedIds).toStrictEqual(["ETH", "BTC"]);
    expect(payload).toStrictEqual(expectedPayload);
  };
}

export async function testGetPricesFromPayload(
  connection: jest.Mocked<ICasperConnection>,
  adapter: PriceRelayAdapterCasperContractAdapter
) {
  connection.queryContractDictionary.mockImplementationOnce(
    getComputedValuesContractDictionaryMock(adapter)
  );

  const prices = await adapter.getPricesFromPayload(makeContractParamsProviderMock());

  expect(prices).toStrictEqual([12345n, 54321n]);
}

function getComputedValuesContractDictionaryMock(adapter: PriceRelayAdapterCasperContractAdapter) {
  return contractDictionaryMock(
    adapter,
    STORAGE_KEY_VALUES,
    MOCK_PAYLOAD_HASH,
    [
      {
        timestamp: 0,
        values: [u256Value(11111), u256Value(55555)],
        feedIds: ["ETH", "BTC"],
      },
      {
        timestamp: 0,
        values: [u256Value(12345), u256Value(54321)],
        feedIds: ["ETH", "BTC"],
      },
      {
        timestamp: 0,
        values: [u256Value(11111), u256Value(55555)],
        feedIds: ["ETH"],
      },
    ],
    "2"
  );
}
