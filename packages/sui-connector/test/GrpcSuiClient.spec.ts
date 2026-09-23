import { TypeTagSerializer } from "@mysten/sui/bcs";
import { deriveDynamicFieldID, normalizeStructTag, SUI_TYPE_ARG } from "@mysten/sui/utils";
import { makeFeedIdBytes, makeSuiClient, makeSuiGraphQLClient, uint8ArrayToBcs } from "../src";
import { GrpcSuiClient, MISSING_FIELD_MESSAGE } from "../src/client/GrpcSuiClient";
import type { ReceivedTransactionNodes } from "../src/client/graphql-types";
import {
  ADAPTER_OBJECT_ID,
  CURSOR,
  FEED_ID,
  GRAPHQL_ERROR,
  NETWORK,
  OTHER_ADDRESS,
  PAYLOAD_BYTES,
  SENDER,
} from "./fixtures";

const USDC_TYPE_ARG = "0x9::usdc::USDC";
const SUI_COIN_TYPE = normalizeStructTag(`0x2::coin::Coin<${SUI_TYPE_ARG}>`);
const OTHER_COIN_TYPE = normalizeStructTag(`0x2::coin::Coin<${USDC_TYPE_ARG}>`);
const TREASURY_CAP_TYPE = normalizeStructTag(`0x2::coin::TreasuryCap<${SUI_TYPE_ARG}>`);
const PRIMITIVE_PARAM_TYPE = normalizeStructTag("0x2::table::Table<u64, u64>");
const OLDEST_COIN_ID = "0xc01d";
const NEWEST_COIN_ID = "0xc02d";
const LIMIT = 10;
const FEED_ID_TYPE = "vector<u8>";
const FIELD_NAME = {
  type: FEED_ID_TYPE,
  bcs: uint8ArrayToBcs(makeFeedIdBytes(FEED_ID)).toBytes(),
};
const UNRELATED_ERROR = "Deprecated method";

describe("GrpcSuiClient", () => {
  let sut: GrpcSuiClient;
  let query: jest.SpyInstance;
  let getDynamicFieldValue: jest.SpyInstance;

  beforeEach(() => {
    const graphqlClient = makeSuiGraphQLClient(NETWORK);
    query = jest.spyOn(graphqlClient, "query");
    sut = new GrpcSuiClient(makeSuiClient(NETWORK), graphqlClient);
    getDynamicFieldValue = jest.spyOn(sut.objects, "getDynamicFieldValue");
  });

  describe("getReceivedCoinObjectIds", () => {
    it("should return the newest coin first, although GraphQL pages oldest first", async () => {
      stubPage([
        makeTransaction(OTHER_ADDRESS, OLDEST_COIN_ID, SUI_COIN_TYPE),
        makeTransaction(OTHER_ADDRESS, NEWEST_COIN_ID, SUI_COIN_TYPE),
      ]);

      const { objectIds } = await scan();

      expect(objectIds).toEqual([NEWEST_COIN_ID, OLDEST_COIN_ID]);
    });

    it("should skip a transaction sent by the scanned address", async () => {
      stubPage([
        makeTransaction(SENDER, OLDEST_COIN_ID, SUI_COIN_TYPE),
        makeTransaction(OTHER_ADDRESS, NEWEST_COIN_ID, SUI_COIN_TYPE),
      ]);

      const { objectIds } = await scan();

      expect(objectIds).toEqual([NEWEST_COIN_ID]);
    });

    it("should take a coin of the asked type written in its short form", async () => {
      stubPage([makeTransaction(OTHER_ADDRESS, NEWEST_COIN_ID, SUI_COIN_TYPE)]);

      const { objectIds } = await scan({ coinType: SUI_TYPE_ARG });

      expect(objectIds).toEqual([NEWEST_COIN_ID]);
    });

    it("should skip a coin of another type", async () => {
      stubPage([makeTransaction(OTHER_ADDRESS, NEWEST_COIN_ID, OTHER_COIN_TYPE)]);

      const { objectIds } = await scan();

      expect(objectIds).toEqual([]);
    });

    it("should skip another struct parametrized with the asked coin", async () => {
      stubPage([makeTransaction(OTHER_ADDRESS, NEWEST_COIN_ID, TREASURY_CAP_TYPE)]);

      const { objectIds } = await scan();

      expect(objectIds).toEqual([]);
    });

    it("should skip an object whose type carries a primitive parameter", async () => {
      stubPage([makeTransaction(OTHER_ADDRESS, NEWEST_COIN_ID, PRIMITIVE_PARAM_TYPE)]);

      const { objectIds } = await scan();

      expect(objectIds).toEqual([]);
    });

    it("should skip a coin that ended up at another owner", async () => {
      const transaction = makeTransaction(OTHER_ADDRESS, NEWEST_COIN_ID, SUI_COIN_TYPE);
      transaction.effects.objectChanges.nodes[0].outputState.owner.owner.address = OTHER_ADDRESS;
      stubPage([transaction]);

      const { objectIds } = await scan();

      expect(objectIds).toEqual([]);
    });

    it("should take the coins it got when the object changes of a transaction are truncated", async () => {
      const transaction = makeTransaction(OTHER_ADDRESS, NEWEST_COIN_ID, SUI_COIN_TYPE);
      transaction.effects.objectChanges.pageInfo.hasNextPage = true;
      stubPage([transaction]);

      const { objectIds } = await scan();

      expect(objectIds).toEqual([NEWEST_COIN_ID]);
    });

    it("should throw on a GraphQL error instead of reporting no coins", async () => {
      stubPage([], { errors: [{ message: GRAPHQL_ERROR }] });

      await expect(scan()).rejects.toThrow(GRAPHQL_ERROR);
    });

    it("should ask GraphQL for the newest page and continue backwards from the cursor", async () => {
      stubPage([]);

      await scan();
      await scan({ cursor: CURSOR });

      expect(query).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ variables: { address: SENDER, last: LIMIT, before: null } })
      );
      expect(query).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ variables: { address: SENDER, last: LIMIT, before: CURSOR } })
      );
    });

    it("should give back a cursor only when GraphQL has an older page", async () => {
      stubPage([], { hasPreviousPage: true, startCursor: CURSOR });
      const withMore = await scan();

      stubPage([], { hasPreviousPage: false, startCursor: CURSOR });
      const withoutMore = await scan();

      expect(withMore.cursor).toEqual(CURSOR);
      expect(withoutMore.cursor).toEqual(undefined);
    });

    function scan({ coinType, cursor }: { coinType?: string; cursor?: string } = {}) {
      return sut.getReceivedCoinObjectIds({ address: SENDER, coinType, cursor, limit: LIMIT });
    }

    function stubPage(
      nodes: ReceivedTransactionNodes,
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

    function makeTransaction(sender: string, coinObjectId: string, coinType: string) {
      return {
        sender: { address: sender },
        effects: {
          objectChanges: {
            pageInfo: { hasNextPage: false },
            nodes: [
              {
                outputState: {
                  address: coinObjectId,
                  asMoveObject: { contents: { type: { repr: coinType } } },
                  owner: { owner: { address: SENDER } },
                },
              },
            ],
          },
        },
      };
    }
  });

  describe("getDynamicFieldValues", () => {
    it("should give back the value of a field that is there", async () => {
      getDynamicFieldValue.mockResolvedValue({ dynamicField: { value: { bcs: PAYLOAD_BYTES } } });

      await expect(sut.getDynamicFieldValues(ADAPTER_OBJECT_ID, [FIELD_NAME])).resolves.toEqual([
        PAYLOAD_BYTES,
      ]);
    });

    it("should read no value when the missing object is the derived field id", async () => {
      getDynamicFieldValue.mockRejectedValue(new Error(`Object ${derivedFieldId()} not found`));

      await expect(sut.getDynamicFieldValues(ADAPTER_OBJECT_ID, [FIELD_NAME])).resolves.toEqual([
        undefined,
      ]);
    });

    it("should read no value whatever wording the node puts around the field id", async () => {
      getDynamicFieldValue.mockRejectedValue(
        new Error(`object ${derivedFieldId()} was not found on this node`)
      );

      await expect(sut.getDynamicFieldValues(ADAPTER_OBJECT_ID, [FIELD_NAME])).resolves.toEqual([
        undefined,
      ]);
    });

    it("should read no value when the thrown object is not an Error instance", async () => {
      getDynamicFieldValue.mockRejectedValue({ message: MISSING_FIELD_MESSAGE });

      await expect(sut.getDynamicFieldValues(ADAPTER_OBJECT_ID, [FIELD_NAME])).resolves.toEqual([
        undefined,
      ]);
    });

    it("should rethrow a read that failed with nothing thrown along", async () => {
      getDynamicFieldValue.mockRejectedValue(undefined);

      await expect(sut.getDynamicFieldValues(ADAPTER_OBJECT_ID, [FIELD_NAME])).rejects.toEqual(
        undefined
      );
    });

    it("should throw when another object is the missing one", async () => {
      getDynamicFieldValue.mockRejectedValue(new Error(`Object ${OTHER_ADDRESS} not found`));

      await expect(sut.getDynamicFieldValues(ADAPTER_OBJECT_ID, [FIELD_NAME])).rejects.toThrow(
        OTHER_ADDRESS
      );
    });

    it("should throw when the read failed for any other reason", async () => {
      getDynamicFieldValue.mockRejectedValue(new Error(UNRELATED_ERROR));

      await expect(sut.getDynamicFieldValues(ADAPTER_OBJECT_ID, [FIELD_NAME])).rejects.toThrow(
        UNRELATED_ERROR
      );
    });

    function derivedFieldId() {
      return deriveDynamicFieldID(
        ADAPTER_OBJECT_ID,
        TypeTagSerializer.parseFromStr(FEED_ID_TYPE),
        FIELD_NAME.bcs
      );
    }
  });
});
