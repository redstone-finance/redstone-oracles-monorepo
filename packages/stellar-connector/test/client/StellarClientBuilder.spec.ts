import { Address, rpc, xdr } from "@stellar/stellar-sdk";
import { contractDataKey, StellarClient, StellarClientBuilder } from "../../src";

type EntryParams = { value: number; ttl: number };

const CONTRACT = Address.contract(Buffer.alloc(32, 1)).toString();
const FEED_KEY = xdr.ScVal.scvSymbol("ETH");
const LATEST_LEDGER = 10;
const HONEST_TTL = 1_000;
const INFLATED_TTL = 9_000;
const HONEST_VALUE = 1;
const SUBSTITUTED_VALUE = 2;
const OTHER_SUBSTITUTED_VALUE = 3;
const HONEST_ENTRY = { value: HONEST_VALUE, ttl: HONEST_TTL };
const LYING_HOST = "lying.stellar.test";
const FIRST_HONEST_HOST = "first-honest.stellar.test";
const SECOND_HONEST_HOST = "second-honest.stellar.test";

describe("StellarClientBuilder", () => {
  let sut: StellarClient;

  beforeEach(() => {
    sut = new StellarClientBuilder()
      .withStellarNetwork("testnet")
      .withRpcUrls(
        [LYING_HOST, FIRST_HONEST_HOST, SECOND_HONEST_HOST].map((host) => `https://${host}`)
      )
      .build();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("agrees on the instance TTL when one RPC inflates it", async () => {
    stubLedgerEntries({ value: HONEST_VALUE, ttl: INFLATED_TTL });

    expect(await sut.getInstanceTtl(CONTRACT)).toBe(HONEST_TTL);
  });

  it("agrees on entry TTLs when one RPC inflates them", async () => {
    stubLedgerEntries({ value: HONEST_VALUE, ttl: INFLATED_TTL });

    expect(await sut.getEntriesTtls(CONTRACT, ["instance", FEED_KEY])).toEqual([
      HONEST_TTL,
      HONEST_TTL,
    ]);
  });

  it("agrees on fetched entries when one RPC substitutes the value", async () => {
    stubLedgerEntries({ value: SUBSTITUTED_VALUE, ttl: HONEST_TTL });

    const [entry] = await sut.fetchEntriesByKey([contractDataKey(CONTRACT, FEED_KEY)]);

    expect(entry?.val.contractData().val().u32()).toBe(HONEST_VALUE);
  });

  it("agrees on contract data when one RPC substitutes the value", async () => {
    stubLedgerEntries({ value: SUBSTITUTED_VALUE, ttl: HONEST_TTL });

    const value = await sut.getContractData(CONTRACT, FEED_KEY, (entry) =>
      entry.val.contractData().val().u32()
    );

    expect(value).toBe(HONEST_VALUE);
  });

  it("rejects fetched entries when no two RPCs agree", async () => {
    stubLedgerEntries(
      { value: SUBSTITUTED_VALUE, ttl: HONEST_TTL },
      { value: OTHER_SUBSTITUTED_VALUE, ttl: HONEST_TTL }
    );

    await expect(sut.fetchEntriesByKey([contractDataKey(CONTRACT, FEED_KEY)])).rejects.toThrow();
  });

  function stubLedgerEntries(lyingEntry: EntryParams, secondHonestEntry = HONEST_ENTRY) {
    const entryByHost: Record<string, EntryParams> = {
      [LYING_HOST]: lyingEntry,
      [FIRST_HONEST_HOST]: HONEST_ENTRY,
      [SECOND_HONEST_HOST]: secondHonestEntry,
    };

    jest.spyOn(rpc.Server.prototype, "getLedgerEntries").mockImplementation(function (
      this: rpc.Server,
      ...keys
    ) {
      const { value, ttl } = entryByHost[this.serverURL.hostname()];

      return Promise.resolve({
        latestLedger: LATEST_LEDGER,
        entries: keys.map((key) => ({
          key,
          val: xdr.LedgerEntryData.contractData(
            new xdr.ContractDataEntry({
              ext: new xdr.ExtensionPoint(0),
              contract: key.contractData().contract(),
              key: key.contractData().key(),
              durability: key.contractData().durability(),
              val: xdr.ScVal.scvU32(value),
            })
          ),
          liveUntilLedgerSeq: ttl,
        })),
      });
    });
  }
});
