import { NetworkId } from "@radixdlt/radix-engine-toolkit";
import { ContractParamsProviderMock } from "@redstone-finance/sdk";
import { BigNumber } from "ethers";
import {
  MultiFeedPriceAdapterRadixContractConnector,
  PriceAdapterRadixContractAdapter,
  RadixClient,
} from "../src";
import { transactionCommittedDetails } from "./__mocks__/transactions";
import {
  mockDefaultValues,
  transactionCommittedDetailsMock,
} from "./mock-default-values";

const MOCK_PAYLOAD_HEX = "455448";
export const MOCK_PRIVATE_KEY =
  "aa602e9895fd07a75b1becbb3dd5f409664cff5047117eb4a16e8e3c8fdf4641";
const MOCK_COMPONENT_ID =
  "component_tdx_2_1crkz0vvpnuslwwfqmxxne67ygn8wrrtqcqhpn0yex2l27ruyvxg5tm";

export function makeContractParamsProviderMock(
  feedIds: string[] = ["ETH", "BTC"]
) {
  return new ContractParamsProviderMock(feedIds, "./payload.hex", (_) =>
    Buffer.from(MOCK_PAYLOAD_HEX)
  );
}

describe("PriceAdapterRadixContractAdapter tests", () => {
  let sut: PriceAdapterRadixContractAdapter;

  beforeEach(async () => {
    mockDefaultValues();

    sut = await new MultiFeedPriceAdapterRadixContractConnector(
      new RadixClient(NetworkId.Stokenet, { secp256k1: MOCK_PRIVATE_KEY }),
      MOCK_COMPONENT_ID
    ).getAdapter();
  });

  it("readTimestampFromContract should return proper values from state", async () => {
    const timestamp = await sut.readTimestampFromContract("XRD");

    expect(timestamp).toBe(1741258279000);
  });

  it("readPricesFromContract should return proper value from the state", async () => {
    const paramsProvider = makeContractParamsProviderMock();

    const prices = await sut.readPricesFromContract(paramsProvider);
    expect(prices).toStrictEqual([
      BigNumber.from("0x35786397e2"),
      BigNumber.from("0x084d466cdd35"),
    ]);
  });

  it("readTimestampFromContractWithMethod should return proper value by using method", async () => {
    transactionCommittedDetails.mockResolvedValueOnce(
      transactionCommittedDetailsMock([
        "5c2100",
        "5c0ad00f04e292010000",
        "5c2100",
      ])
    );

    sut.readMode = "CallReadMethod";
    const timestamp = await sut.readTimestampFromContract();

    expect(timestamp).toBe(1730368770000);
  });

  it("getPricesFromPayload should return proper values", async () => {
    const paramsProvider = makeContractParamsProviderMock();

    const prices = await sut.getPricesFromPayload(paramsProvider);
    expect(prices).toStrictEqual([
      BigNumber.from("0x353c482368"),
      BigNumber.from("0x084721beb603"),
    ]);
  });

  it("readPricesFromContract should return proper value by using method", async () => {
    const paramsProvider = makeContractParamsProviderMock();

    transactionCommittedDetails.mockResolvedValueOnce(
      transactionCommittedDetailsMock([
        "5c2100",
        "5c202102012007200000000000000000000000000000000000000000000000000000003540817c9b012007200000000000000000000000000000000000000000000000000000084845ba3b74",
        "5c2100",
      ])
    );

    sut.readMode = "CallReadMethod";
    const prices = await sut.readPricesFromContract(paramsProvider);
    expect(prices).toStrictEqual([
      BigNumber.from("0x3540817c9b"),
      BigNumber.from("0x084845ba3b74"),
    ]);
  });

  it("writePricesFromPayloadToContract should return proper values", async () => {
    const paramsProvider = makeContractParamsProviderMock();

    const prices = await sut.writePricesFromPayloadToContract(paramsProvider);
    expect(prices).toStrictEqual([
      BigNumber.from("0x353c482368"),
      BigNumber.from("0x084721beb603"),
    ]);
  });
});
