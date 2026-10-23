import { bcs } from "@mysten/sui/bcs";
import type { SuiClientTypes } from "@mysten/sui/client";
import { Secp256k1Keypair } from "@mysten/sui/keypairs/secp256k1";
import type { Transaction } from "@mysten/sui/transactions";
import { fromBase64, MIST_PER_SUI, normalizeSuiAddress } from "@mysten/sui/utils";
import { makeSuiClient } from "../src";
import { GrpcSuiClient } from "../src/client/GrpcSuiClient";
import { SuiBalanceSweeper } from "../src/SuiBalanceSweeper";
import { DIGEST, GAS_SUMMARY, NETWORK } from "./fixtures";

const SWEEP_TX_GAS_BUDGET = MIST_PER_SUI / 100n;
const MAX_GAS_PAYMENT_OBJECTS = 250;
const INTERVAL_MS = 1_000;
const RPC_ERROR = "Connection refused";

describe("SuiBalanceSweeper", () => {
  const keypair = Secp256k1Keypair.generate();
  const address = keypair.toSuiAddress();
  let listCoins: jest.SpyInstance;
  let signAndExecute: jest.SpyInstance<
    ReturnType<GrpcSuiClient["signAndExecute"]>,
    Parameters<GrpcSuiClient["signAndExecute"]>
  >;
  let sut: SuiBalanceSweeper;

  beforeEach(() => {
    const client = new GrpcSuiClient(makeSuiClient(NETWORK));
    listCoins = jest.spyOn(client, "listCoins");
    signAndExecute = jest.spyOn(client, "signAndExecute").mockResolvedValue(makeExecutedTx());
    jest.spyOn(client, "waitForTransaction").mockResolvedValue(true);

    sut = new SuiBalanceSweeper(client, keypair, INTERVAL_MS);
  });

  afterEach(() => {
    sut.stop();
    jest.useRealTimers();
  });

  it("should not send a transaction when there are no coins", async () => {
    stubCoins([]);

    await sut.sweep();

    expect(signAndExecute).not.toHaveBeenCalled();
  });

  it("should not send a transaction when the coins do not cover the gas budget", async () => {
    stubCoins([SWEEP_TX_GAS_BUDGET / 2n, SWEEP_TX_GAS_BUDGET / 2n]);

    await sut.sweep();

    expect(signAndExecute).not.toHaveBeenCalled();
  });

  it("should pay gas with the coins and send all but the gas budget to its own address balance", async () => {
    const coins = stubCoins([MIST_PER_SUI, 2n * MIST_PER_SUI]);

    await sut.sweep();

    const tx = sentTransaction();
    expect(tx.getData().gasData.payment?.map((ref) => ref.objectId)).toEqual(
      coins.map((coin) => coin.objectId)
    );
    expect(splitAmount(tx)).toEqual(3n * MIST_PER_SUI - SWEEP_TX_GAS_BUDGET);
    expect(sendFundsRecipient(tx)).toEqual(normalizeSuiAddress(address));
  });

  it("should not use more coins than one transaction can take as gas", async () => {
    stubCoins(Array<bigint>(MAX_GAS_PAYMENT_OBJECTS + 1).fill(MIST_PER_SUI));

    await sut.sweep();

    const tx = sentTransaction();
    expect(tx.getData().gasData.payment).toHaveLength(MAX_GAS_PAYMENT_OBJECTS);
    expect(splitAmount(tx)).toEqual(
      BigInt(MAX_GAS_PAYMENT_OBJECTS) * MIST_PER_SUI - SWEEP_TX_GAS_BUDGET
    );
  });

  it("should not throw when the sweep fails", async () => {
    listCoins.mockRejectedValue(new Error(RPC_ERROR));

    await expect(sut.sweep()).resolves.toBeUndefined();
  });

  it("should not start a sweep while another one is running", async () => {
    stubCoins([MIST_PER_SUI]);

    await Promise.all([sut.sweep(), sut.sweep()]);

    expect(signAndExecute).toHaveBeenCalledTimes(1);
  });

  it("should sweep right away and then on every interval", async () => {
    jest.useFakeTimers();
    stubCoins([]);

    sut.start();
    await jest.advanceTimersByTimeAsync(2 * INTERVAL_MS);

    expect(listCoins).toHaveBeenCalledTimes(3);
  });

  it("should not schedule a second timer when started twice", async () => {
    jest.useFakeTimers();
    stubCoins([]);

    sut.start();
    sut.start();
    await jest.advanceTimersByTimeAsync(INTERVAL_MS);

    expect(listCoins).toHaveBeenCalledTimes(2);
  });

  function stubCoins(balances: bigint[]) {
    const coins = balances.map((balance, index) => makeCoin(index, balance));
    listCoins.mockResolvedValue({ objects: coins, cursor: null });

    return coins;
  }

  function makeCoin(index: number, balance: bigint) {
    return {
      objectId: normalizeSuiAddress((index + 1).toString(16)),
      version: "1",
      digest: DIGEST,
      balance: balance.toString(),
    } as SuiClientTypes.Coin;
  }

  function sentTransaction() {
    expect(signAndExecute).toHaveBeenCalledTimes(1);

    return signAndExecute.mock.calls[0][0];
  }

  function splitAmount(tx: Transaction) {
    const { inputs, commands } = tx.getData();
    const amount = commands[0].SplitCoins?.amounts[0];

    return BigInt(bcs.u64().parse(pureBytes(inputs, amount)));
  }

  function sendFundsRecipient(tx: Transaction) {
    const { inputs, commands } = tx.getData();
    const moveCall = commands[1].MoveCall;
    expect(`${moveCall?.package}::${moveCall?.module}::${moveCall?.function}`).toEqual(
      `${normalizeSuiAddress("0x2")}::coin::send_funds`
    );

    return bcs.Address.parse(pureBytes(inputs, moveCall?.arguments[1]));
  }

  function pureBytes(
    inputs: ReturnType<Transaction["getData"]>["inputs"],
    argument?: { $kind: string; Input?: number }
  ) {
    expect(argument?.$kind).toEqual("Input");

    return fromBase64(inputs[argument!.Input!].Pure!.bytes);
  }

  function makeExecutedTx() {
    return {
      $kind: "Transaction",
      Transaction: {
        digest: DIGEST,
        effects: { status: { success: true, error: null }, gasUsed: GAS_SUMMARY },
        events: [],
      },
    } as unknown as Awaited<ReturnType<GrpcSuiClient["signAndExecute"]>>;
  }
});
