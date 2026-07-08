import {
  BlockSignatures,
  ConfirmedSignatureInfo,
  Connection,
  TransactionResponse,
} from "@solana/web3.js";
import { SolanaClient } from "../src";
import { BOUNDARY_SLOT_WALK_LIMIT, SolanaTxScanner } from "../src/client/SolanaTxScanner";

const FROM_SLOT = 100;
const TO_SLOT = 110;
const LATEST_SLOT = 120;
const ADAPTER = "REDSTBDUecGjwXd6YGPzHSvEUBHQqVRfCcjUVgPiHsr";
const SIGNATURES_BATCH_SIZE = 1000;

describe("SolanaTxScanner", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("anchors outside the range so boundary-slot txs are included", async () => {
    const { client, getSignaturesForAddress, getTransaction } = makeClient({
      [FROM_SLOT - 1]: ["below-first", "below-last"],
      [TO_SLOT + 1]: ["above-first", "above-last"],
    });
    const inRange = [
      sigInfo("s-at-to-slot", TO_SLOT),
      sigInfo("s-mid", FROM_SLOT + 5),
      sigInfo("s-at-from-slot", FROM_SLOT),
    ];
    getSignaturesForAddress.mockResolvedValueOnce([
      ...inRange,
      sigInfo("s-below-range", FROM_SLOT - 1),
    ]);

    const result = await new SolanaTxScanner(client).fetchTransactionsInRange(
      FROM_SLOT,
      TO_SLOT,
      new Set([ADAPTER])
    );

    expect(getSignaturesForAddress).toHaveBeenCalledWith(expect.anything(), {
      limit: SIGNATURES_BATCH_SIZE,
      before: "above-first",
      until: "below-last",
    });
    expect(result).toHaveLength(inRange.length);
    expect(getTransaction.mock.calls.map(([signature]) => signature).sort()).toEqual(
      inRange.map(({ signature }) => signature).sort()
    );
  });

  it("walks over skipped boundary slots to the nearest existing block", async () => {
    const { client, getBlockSignatures, getSignaturesForAddress } = makeClient({
      [FROM_SLOT - 3]: ["far-below-first", "far-below-last"],
      [TO_SLOT + 2]: ["far-above-first", "far-above-last"],
    });
    getSignaturesForAddress.mockResolvedValueOnce([sigInfo("s-mid", FROM_SLOT + 5)]);

    await new SolanaTxScanner(client).fetchTransactionsInRange(
      FROM_SLOT,
      TO_SLOT,
      new Set([ADAPTER])
    );

    const probedSlots = getBlockSignatures.mock.calls.flat();
    expect([...probedSlots].sort((a, b) => a - b)).toEqual([
      FROM_SLOT - 3,
      FROM_SLOT - 2,
      FROM_SLOT - 1,
      TO_SLOT + 1,
      TO_SLOT + 2,
    ]);
    expect(getSignaturesForAddress).toHaveBeenCalledWith(expect.anything(), {
      limit: SIGNATURES_BATCH_SIZE,
      before: "far-above-first",
      until: "far-below-last",
    });
  });

  it("does not probe slots newer than the current slot", async () => {
    const { client, getBlockSignatures, getSignaturesForAddress } = makeClient(
      {
        [FROM_SLOT - 1]: ["below-first", "below-last"],
      },
      TO_SLOT
    );
    getSignaturesForAddress.mockResolvedValueOnce([sigInfo("s-mid", FROM_SLOT + 5)]);

    await new SolanaTxScanner(client).fetchTransactionsInRange(
      FROM_SLOT,
      TO_SLOT,
      new Set([ADAPTER])
    );

    const probedSlots = getBlockSignatures.mock.calls.flat();
    expect(probedSlots.filter((slot) => slot > TO_SLOT)).toEqual([]);
    expect(getSignaturesForAddress).toHaveBeenCalledWith(expect.anything(), {
      limit: SIGNATURES_BATCH_SIZE,
      before: undefined,
      until: "below-last",
    });
  });

  it("paginates past a full signatures batch", async () => {
    const { client, getSignaturesForAddress } = makeClient({
      [FROM_SLOT - 1]: ["below-first", "below-last"],
      [TO_SLOT + 1]: ["above-first", "above-last"],
    });
    const fullBatch = Array.from({ length: SIGNATURES_BATCH_SIZE }, (_, i) =>
      sigInfo(`s-${i}`, TO_SLOT)
    );
    const secondBatch = [sigInfo("s-older", FROM_SLOT)];
    getSignaturesForAddress.mockResolvedValueOnce(fullBatch);
    getSignaturesForAddress.mockResolvedValueOnce(secondBatch);

    const result = await new SolanaTxScanner(client).fetchTransactionsInRange(
      FROM_SLOT,
      TO_SLOT,
      new Set([ADAPTER])
    );

    expect(getSignaturesForAddress).toHaveBeenCalledTimes(2);
    expect(getSignaturesForAddress).toHaveBeenLastCalledWith(expect.anything(), {
      limit: SIGNATURES_BATCH_SIZE,
      before: `s-${SIGNATURES_BATCH_SIZE - 1}`,
      until: "below-last",
    });
    expect(result).toHaveLength(SIGNATURES_BATCH_SIZE + secondBatch.length);
  });

  it("throws when no lower-bound block is found within the walk limit", async () => {
    const { client, getSignaturesForAddress } = makeClient({
      [TO_SLOT + 1]: ["above-first", "above-last"],
    });

    await expect(
      new SolanaTxScanner(client).fetchTransactionsInRange(FROM_SLOT, TO_SLOT, new Set([ADAPTER]))
    ).rejects.toThrow(`No block found within ${BOUNDARY_SLOT_WALK_LIMIT} slots below`);

    expect(getSignaturesForAddress).not.toHaveBeenCalled();
  });
});

function makeClient(blocks: Record<number, string[] | undefined>, latestSlot = LATEST_SLOT) {
  const client = new SolanaClient(new Connection("http://localhost"));

  const getBlockSignatures = jest.spyOn(client, "getBlockSignatures").mockImplementation((slot) => {
    const signatures = blocks[slot];
    if (!signatures) {
      return Promise.reject(new Error(`Block not available for slot ${slot}`));
    }

    return Promise.resolve(blockSignatures(slot, signatures));
  });
  const getSignaturesForAddress = jest
    .spyOn(client, "getSignaturesForAddress")
    .mockResolvedValue([]);
  const getTransaction = jest
    .spyOn(client, "getTransaction")
    .mockImplementation((signature) =>
      Promise.resolve({ signature } as unknown as TransactionResponse)
    );
  jest.spyOn(client, "getSlot").mockResolvedValue(latestSlot);

  return { client, getBlockSignatures, getSignaturesForAddress, getTransaction };
}

function sigInfo(signature: string, slot: number): ConfirmedSignatureInfo {
  return { signature, slot, err: null, memo: null };
}

function blockSignatures(slot: number, signatures: string[]): BlockSignatures {
  return {
    blockhash: `hash-${slot}`,
    previousBlockhash: `hash-${slot - 1}`,
    parentSlot: slot - 1,
    signatures,
    blockTime: null,
  };
}
