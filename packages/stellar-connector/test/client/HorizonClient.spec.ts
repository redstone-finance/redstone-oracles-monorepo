import { Horizon } from "@stellar/stellar-sdk";
import {
  HORIZON_MAX_PAGE_LIMIT,
  HorizonClient,
  HorizonHistoryRecord,
} from "../../src/client/HorizonClient";

const ACCOUNT_ID = "GAZ4HCTWWUAMVV5RXMUARAO3CGJYA77DTKPOXF45BOXSOG6CJ2L4CWIK";
const NOW_MS = Date.parse("2026-10-07T12:00:00Z");
const HOUR_MS = 60 * 60 * 1000;

const makeRecord = (hoursAgo: number) =>
  ({
    created_at: new Date(NOW_MS - hoursAgo * HOUR_MS).toISOString(),
  }) as HorizonHistoryRecord;

const makePages = (pages: HorizonHistoryRecord[][]) => {
  const makePage = (index: number): Horizon.ServerApi.CollectionPage<HorizonHistoryRecord> =>
    ({
      records: pages[index],
      next: () => Promise.resolve(makePage(index + 1)),
    }) as unknown as Horizon.ServerApi.CollectionPage<HorizonHistoryRecord>;

  return makePage(0);
};

const makeClient = (pages: HorizonHistoryRecord[][]) => {
  const limit = jest.fn();
  const builder = {
    forAccount: jest.fn().mockReturnThis(),
    cursor: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: limit.mockReturnThis(),
    call: jest.fn().mockResolvedValue(makePages(pages)),
  };
  const server = {
    payments: () => builder,
    operations: () => builder,
  } as unknown as Horizon.Server;

  return { client: new HorizonClient(server), builder };
};

describe("HorizonClient", () => {
  it("should stop paging once the oldest record predates sinceMs", async () => {
    const pages = [
      [makeRecord(1), makeRecord(2)],
      [makeRecord(3), makeRecord(30)],
      [makeRecord(40)],
    ];
    const { client, builder } = makeClient(pages);

    const records = await client.getPayments({
      accountId: ACCOUNT_ID,
      sinceMs: NOW_MS - 24 * HOUR_MS,
    });

    expect(records).toEqual([...pages[0], ...pages[1]]);
    expect(builder.forAccount).toHaveBeenCalledWith(ACCOUNT_ID);
    expect(builder.order).toHaveBeenCalledWith("desc");
    expect(builder.limit).toHaveBeenCalledWith(HORIZON_MAX_PAGE_LIMIT);
  });

  it("should keep paging while the oldest record is exactly at sinceMs", async () => {
    const pages = [[makeRecord(24)], [makeRecord(25)]];
    const { client } = makeClient(pages);

    const records = await client.getPayments({
      accountId: ACCOUNT_ID,
      sinceMs: NOW_MS - 24 * HOUR_MS,
    });

    expect(records).toEqual([...pages[0], ...pages[1]]);
  });

  it("should use the operations endpoint for getOperations", async () => {
    const pages = [[makeRecord(1)], []];
    const { client, builder } = makeClient(pages);

    const records = await client.getOperations({
      accountId: ACCOUNT_ID,
      sinceMs: NOW_MS - 24 * HOUR_MS,
    });

    expect(records).toEqual(pages[0]);
    expect(builder.forAccount).toHaveBeenCalledWith(ACCOUNT_ID);
  });

  it("should stop paging on an empty page", async () => {
    const pages = [[makeRecord(1)], []];
    const { client } = makeClient(pages);

    const records = await client.getPayments({
      accountId: ACCOUNT_ID,
      sinceMs: NOW_MS - 24 * HOUR_MS,
    });

    expect(records).toEqual(pages[0]);
  });

  it("should page ascending after a cursor until a short page", async () => {
    const fullPage = Array.from({ length: HORIZON_MAX_PAGE_LIMIT }, () => makeRecord(1));
    const pages = [fullPage, [makeRecord(0.5)], [makeRecord(0.25)]];
    const { client, builder } = makeClient(pages);

    const records = await client.getPayments({
      accountId: ACCOUNT_ID,
      sinceMs: NOW_MS - 24 * HOUR_MS,
      afterCursor: "123",
    });

    expect(records).toEqual([...pages[0], ...pages[1]]);
    expect(builder.cursor).toHaveBeenCalledWith("123");
    expect(builder.order).toHaveBeenCalledWith("asc");
  });
});
