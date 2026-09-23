import { toBase64 } from "@mysten/bcs";
import { MULTI_FEED_RELAYER_UPDATE_FUNCTION_TYPE } from "@redstone-finance/multichain-kit";
import type { RawGqlTx } from "../src/client/graphql-types";
import { GraphQLSuiTxLookup } from "../src/client/lookup/GraphQLSuiTxLookup";
import { makeFeedIdBytes, makeSuiGraphQLClient, uint8ArrayToBcs } from "../src/util";
import {
  ADAPTER_OBJECT_ID,
  CURSOR,
  DIGEST,
  FEED_ID,
  GAS_SUMMARY,
  GAS_SUMMARY_COST,
  GRAPHQL_ERROR,
  NETWORK,
  PAYLOAD_BYTES,
  PAYLOAD_HEX,
  SENDER,
  WRITE_PRICE_FUNCTION,
} from "./fixtures";

const START_BLOCK = 100;
const END_BLOCK = 200;
const IN_RANGE_BLOCK = 150;
const MANIFEST = { adapterContract: ADAPTER_OBJECT_ID, walletAddresses: [SENDER] };
const PAGE = { manifests: [MANIFEST], startBlock: START_BLOCK, endBlock: END_BLOCK };
const PAGE_SIZE = 50;
const PURE = "Pure";
const MOVE_VALUE = "MoveValue";
const INPUT_ARGUMENT = "Input";
const BLOCK_TIMESTAMP_ISO = "2026-09-22T12:40:50.000Z";
const BLOCK_TIMESTAMP_SECONDS = 1790080850;
const GAS_BUDGET = "120000000";
const GAS_PRICE = "1000";

describe("GraphQLSuiTxLookup", () => {
  let sut: GraphQLSuiTxLookup;
  let query: jest.SpyInstance;

  beforeEach(() => {
    const graphqlClient = makeSuiGraphQLClient(NETWORK);
    query = jest.spyOn(graphqlClient, "query");
    sut = new GraphQLSuiTxLookup(graphqlClient);
  });

  it("should normalize a write transaction from the page", async () => {
    stubPage([makeRawTx()]);

    const { data, hasNextPage } = await sut.fetchPage(PAGE);

    expect(hasNextPage).toEqual(false);
    expect(data).toEqual([
      {
        blockNumber: IN_RANGE_BLOCK,
        blockTimestamp: BLOCK_TIMESTAMP_SECONDS,
        hash: DIGEST,
        from: SENDER,
        to: ADAPTER_OBJECT_ID,
        data: PAYLOAD_HEX,
        gasLimit: GAS_BUDGET,
        gasPrice: GAS_PRICE,
        gasUsed: GAS_SUMMARY_COST,
        isFailed: false,
        events: undefined,
        functionType: MULTI_FEED_RELAYER_UPDATE_FUNCTION_TYPE,
      },
    ]);
  });

  it("should ask GraphQL for the newest page bounded by the asked checkpoints", async () => {
    stubPage([makeRawTx()]);

    await sut.fetchPage(PAGE);

    expect(query).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: {
          objectId: ADAPTER_OBJECT_ID,
          last: PAGE_SIZE,
          before: undefined,
          afterCheckpoint: START_BLOCK - 1,
          beforeCheckpoint: END_BLOCK + 1,
        },
      })
    );
  });

  it("should drop a transaction from outside the asked range", async () => {
    stubPage([makeRawTx({ blockNumber: END_BLOCK + 1 })]);

    const { data } = await sut.fetchPage(PAGE);

    expect(data).toEqual([]);
  });

  it("should read inputs that GraphQL returns as MoveValue", async () => {
    stubPage([makeRawTx({ inputTypename: MOVE_VALUE })]);

    const { data } = await sut.fetchPage(PAGE);

    expect(data).toMatchObject([{ hash: DIGEST, data: PAYLOAD_HEX }]);
  });

  it("should throw on a GraphQL error instead of reporting an empty page", async () => {
    stubPage([], { errors: [{ message: GRAPHQL_ERROR }] });

    await expect(sut.fetchPage(PAGE)).rejects.toThrow(GRAPHQL_ERROR);
  });

  it("should throw when the inputs of a transaction do not fit one page", async () => {
    const rawTx = makeRawTx();
    rawTx.kind.inputs.pageInfo.hasNextPage = true;
    stubPage([rawTx]);

    await expect(sut.fetchPage(PAGE)).rejects.toThrow(
      `Transaction ${DIGEST} carries more inputs than one GraphQL page`
    );
  });

  it("should throw when the events of a transaction do not fit one page", async () => {
    const rawTx = makeRawTx();
    rawTx.effects.events.pageInfo.hasNextPage = true;
    stubPage([rawTx]);

    await expect(sut.fetchPage(PAGE)).rejects.toThrow(
      `Transaction ${DIGEST} carries more events than one GraphQL page`
    );
  });

  it("should page on when GraphQL has older transactions in the range", async () => {
    stubPage([makeRawTx()], { hasPreviousPage: true, startCursor: CURSOR });

    const result = await sut.fetchPage(PAGE);

    expect(result.hasNextPage).toEqual(true);
    expect(result.nextCursor).toEqual({ [ADAPTER_OBJECT_ID]: CURSOR });
  });

  it("should throw when transactions are left in the range but no cursor came back", async () => {
    stubPage([makeRawTx()], { hasPreviousPage: true, startCursor: null });

    await expect(sut.fetchPage(PAGE)).rejects.toThrow("no cursor");
  });

  function stubPage(
    nodes: RawGqlTx[],
    {
      errors,
      hasPreviousPage = false,
      startCursor = null,
    }: {
      errors?: { message: string }[];
      hasPreviousPage?: boolean;
      startCursor?: string | null;
    } = {}
  ) {
    query.mockResolvedValue({
      errors,
      data: { transactions: { nodes, pageInfo: { hasPreviousPage, startCursor } } },
    });
  }

  function makeRawTx({ blockNumber = IN_RANGE_BLOCK, inputTypename = PURE } = {}) {
    return {
      digest: DIGEST,
      sender: { address: SENDER },
      effects: {
        checkpoint: { sequenceNumber: blockNumber, timestamp: BLOCK_TIMESTAMP_ISO },
        status: "SUCCESS",
        gasEffects: { gasSummary: GAS_SUMMARY },
        events: { pageInfo: { hasNextPage: false }, nodes: [] },
      },
      gasInput: { gasBudget: GAS_BUDGET, gasPrice: GAS_PRICE },
      kind: {
        __typename: "ProgrammableTransaction",
        inputs: {
          pageInfo: { hasNextPage: false },
          nodes: [
            { __typename: "SharedInput", address: ADAPTER_OBJECT_ID },
            makePureInput(inputTypename, uint8ArrayToBcs(makeFeedIdBytes(FEED_ID)).toBytes()),
            makePureInput(inputTypename, uint8ArrayToBcs(PAYLOAD_BYTES).toBytes()),
          ],
        },
        commands: {
          pageInfo: { hasNextPage: false },
          nodes: [
            {
              __typename: "MoveCallCommand",
              function: { name: WRITE_PRICE_FUNCTION },
              arguments: [0, 1, 2].map((ix) => ({ __typename: INPUT_ARGUMENT, ix })),
            },
          ],
        },
      },
    };
  }

  function makePureInput(typename: string, bcsBytes: Uint8Array) {
    const encoded = toBase64(bcsBytes);

    return typename === PURE
      ? { __typename: PURE, bytes: encoded }
      : { __typename: MOVE_VALUE, bcs: encoded };
  }
});
