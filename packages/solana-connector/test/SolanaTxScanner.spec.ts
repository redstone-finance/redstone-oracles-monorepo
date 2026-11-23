import { MultiExecutor } from "@redstone-finance/utils";
import { SolanaClient } from "../src";
import { BOUNDARY_SLOT_WALK_LIMIT, SolanaTxScanner } from "../src/client/SolanaTxScanner";
import { FakeSolanaNode } from "./FakeSolanaNode";

const FROM_SLOT = 100;
const TO_SLOT = 110;
const LATEST_SLOT = 120;
const ADAPTER = "REDSTBDUecGjwXd6YGPzHSvEUBHQqVRfCcjUVgPiHsr";
const SIGNATURES_BATCH_SIZE = 1000;
const VOTE_BELOW = "vote-below";
const VOTE_ABOVE = "vote-above";
const ADAPTER_FAR_BELOW = "adapter-far-below";
const ADAPTER_BELOW = "adapter-below";
const ADAPTER_AT_FROM = "adapter-at-from";
const ADAPTER_MID = "adapter-mid";
const ADAPTER_AT_TO = "adapter-at-to";
const ADAPTER_ABOVE = "adapter-above";
const ADAPTER_FAR_ABOVE = "adapter-far-above";
const ADAPTER_SIGNATURES = new Set([
  ADAPTER_FAR_BELOW,
  ADAPTER_BELOW,
  ADAPTER_AT_FROM,
  ADAPTER_MID,
  ADAPTER_AT_TO,
  ADAPTER_ABOVE,
  ADAPTER_FAR_ABOVE,
]);
const RANGE_BLOCKS = {
  [FROM_SLOT - 1]: [VOTE_BELOW, ADAPTER_BELOW],
  [FROM_SLOT]: ["vote-at-from", ADAPTER_AT_FROM],
  [FROM_SLOT + 5]: [ADAPTER_MID, "vote-mid"],
  [TO_SLOT]: [ADAPTER_AT_TO, "vote-at-to"],
  [TO_SLOT + 1]: [VOTE_ABOVE, ADAPTER_ABOVE],
};
const RANGE_ADAPTER_SIGNATURES = [ADAPTER_AT_TO, ADAPTER_MID, ADAPTER_AT_FROM];

describe("SolanaTxScanner", () => {
  it("returns the adapter transactions of the range, boundary slots included", async () => {
    const node = new FakeSolanaNode(RANGE_BLOCKS, ADAPTER_SIGNATURES, LATEST_SLOT);

    expect(await fetchRangeSignatures(node)).toEqual(RANGE_ADAPTER_SIGNATURES);
  });

  it("walks over skipped boundary slots to the nearest existing block", async () => {
    const node = new FakeSolanaNode(
      {
        [FROM_SLOT - 3]: [VOTE_BELOW, ADAPTER_FAR_BELOW],
        [FROM_SLOT]: [ADAPTER_AT_FROM],
        [TO_SLOT]: [ADAPTER_AT_TO],
        [TO_SLOT + 2]: [ADAPTER_FAR_ABOVE],
      },
      ADAPTER_SIGNATURES,
      LATEST_SLOT
    );

    expect(await fetchRangeSignatures(node)).toEqual([ADAPTER_AT_TO, ADAPTER_AT_FROM]);
  });

  it("returns the range ending at the current slot, with no block above it", async () => {
    const node = new FakeSolanaNode(RANGE_BLOCKS, ADAPTER_SIGNATURES, TO_SLOT);

    expect(await fetchRangeSignatures(node)).toEqual(RANGE_ADAPTER_SIGNATURES);
  });

  it("returns every transaction past a full signatures batch", async () => {
    const batchAndOne = Array.from(
      { length: SIGNATURES_BATCH_SIZE + 1 },
      (_, index) => `adapter-${index}`
    );
    const node = new FakeSolanaNode(
      {
        [FROM_SLOT - 1]: [VOTE_BELOW],
        [FROM_SLOT + 5]: batchAndOne,
        [TO_SLOT + 1]: [VOTE_ABOVE],
      },
      new Set(batchAndOne),
      LATEST_SLOT
    );

    expect(await fetchRangeSignatures(node)).toEqual([...batchAndOne].reverse());
  });

  it("returns the range from the next provider when the first one has no anchor block yet", async () => {
    const behindAnchor = new FakeSolanaNode(RANGE_BLOCKS, ADAPTER_SIGNATURES, TO_SLOT, LATEST_SLOT);
    const upToDate = new FakeSolanaNode(RANGE_BLOCKS, ADAPTER_SIGNATURES, LATEST_SLOT);

    expect(
      await fetchRangeSignatures(MultiExecutor.create<SolanaClient>([behindAnchor, upToDate]))
    ).toEqual(RANGE_ADAPTER_SIGNATURES);
  });

  it("throws when no lower-bound block is found within the walk limit", async () => {
    const node = new FakeSolanaNode(
      { [TO_SLOT + 1]: [VOTE_ABOVE] },
      ADAPTER_SIGNATURES,
      LATEST_SLOT
    );

    await expect(fetchRangeSignatures(node)).rejects.toThrow(
      `No block found within ${BOUNDARY_SLOT_WALK_LIMIT} slots below`
    );
  });

  async function fetchRangeSignatures(client: SolanaClient) {
    const txs = await new SolanaTxScanner(client).fetchTransactionsInRange(
      FROM_SLOT,
      TO_SLOT,
      new Set([ADAPTER])
    );

    return txs.map((tx) => tx.transaction.signatures[0]);
  }
});
