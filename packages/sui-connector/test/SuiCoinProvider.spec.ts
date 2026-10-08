import type { SuiClientTypes } from "@mysten/sui/client";
import { Secp256k1Keypair } from "@mysten/sui/keypairs/secp256k1";
import { Transaction } from "@mysten/sui/transactions";
import { MIST_PER_SUI, normalizeSuiAddress, SUI_TYPE_ARG } from "@mysten/sui/utils";
import { makeSuiClient } from "../src";
import { GrpcSuiClient } from "../src/client/GrpcSuiClient";
import { SuiCoinProvider } from "../src/SuiCoinProvider";
import { DIGEST, NETWORK } from "./fixtures";

const MINIMUM_COIN_BALANCE = MIST_PER_SUI;
const ADDRESS_BALANCE = 9n * MIST_PER_SUI;
const COIN_ID = "0x7";
const COIN_VERSION = "1";
const BALANCE_ERROR = "getBalance is not a function";
const EXPIRATION = {
  ValidDuring: {
    minEpoch: "1100",
    maxEpoch: "1101",
    minTimestamp: null,
    maxTimestamp: null,
    chain: "4c78adac",
    nonce: 7,
  },
};

describe("SuiCoinProvider", () => {
  let client: GrpcSuiClient;
  let keypair: Secp256k1Keypair;
  let getAddressBalance: jest.SpyInstance;
  let signAndExecute: jest.SpyInstance;
  let sut: SuiCoinProvider;

  beforeEach(() => {
    client = new GrpcSuiClient(makeSuiClient(NETWORK));
    keypair = Secp256k1Keypair.generate();
    jest
      .spyOn(client, "getReceivedCoinObjectIds")
      .mockResolvedValue({ objectIds: [], cursor: undefined });
    jest.spyOn(client, "waitForTransaction").mockResolvedValue(true);
    jest.spyOn(client, "getValidDuringExpiration").mockResolvedValue(EXPIRATION);
    getAddressBalance = jest.spyOn(client, "getAddressBalance");
    signAndExecute = jest.spyOn(client, "signAndExecute").mockResolvedValue(<
      SuiClientTypes.TransactionResult<{ effects: true; events: true }>
    >{
      $kind: "Transaction",
      Transaction: { digest: DIGEST, effects: { status: { success: true, error: null } } },
    });
    sut = new SuiCoinProvider(client);
  });

  it("should redeem the address balance into a coin, keeping the gas budget of the redeem", async () => {
    stubCoins([makeCoin(MINIMUM_COIN_BALANCE + 1n)]);
    getAddressBalance.mockResolvedValue(ADDRESS_BALANCE);

    const sourceCoins = await sut.getSourceCoins(MINIMUM_COIN_BALANCE, keypair);

    expect(sourceCoins).toEqual([COIN_ID]);
    expect(getAddressBalance).toHaveBeenCalledWith(keypair.toSuiAddress());
    expect(signAndExecute).toHaveBeenCalledWith(expect.any(Transaction), keypair);

    const [[redeemTx]] = signAndExecute.mock.calls as [Transaction][];
    const { gasData, commands, inputs, expiration } = redeemTx.getData();
    const [withdrawal] = inputs;

    expect(gasData.payment).toEqual([]);
    expect(expiration).toMatchObject(EXPIRATION);
    expect(commands.map((command) => command.$kind)).toEqual(["MoveCall", "TransferObjects"]);
    expect(commands[0].MoveCall).toMatchObject({
      package: normalizeSuiAddress("0x2"),
      module: "coin",
      function: "redeem_funds",
    });
    expect(
      BigInt(withdrawal.FundsWithdrawal!.reservation.MaxAmountU64) + BigInt(gasData.budget!)
    ).toBe(ADDRESS_BALANCE);
  });

  it("should not redeem an empty address balance", async () => {
    stubCoins([makeCoin(MINIMUM_COIN_BALANCE + 1n)]);
    getAddressBalance.mockResolvedValue(0n);

    const sourceCoins = await sut.getSourceCoins(MINIMUM_COIN_BALANCE, keypair);

    expect(sourceCoins).toEqual([COIN_ID]);
    expect(signAndExecute).not.toHaveBeenCalled();
  });

  it("should find no source coin when the address balance cannot be read", async () => {
    stubCoins([makeCoin(MINIMUM_COIN_BALANCE + 1n)]);
    getAddressBalance.mockRejectedValue(new Error(BALANCE_ERROR));

    const sourceCoins = await sut.getSourceCoins(MINIMUM_COIN_BALANCE, keypair);

    expect(sourceCoins).toBeUndefined();
    expect(signAndExecute).not.toHaveBeenCalled();
  });

  function stubCoins(objects: SuiClientTypes.Coin[]) {
    jest.spyOn(client, "listCoins").mockResolvedValue({ objects, cursor: null });
  }

  function makeCoin(balance: bigint) {
    return <SuiClientTypes.Coin>{
      objectId: COIN_ID,
      version: COIN_VERSION,
      digest: DIGEST,
      owner: { $kind: "AddressOwner", AddressOwner: keypair.toSuiAddress() },
      type: SUI_TYPE_ARG,
      balance: balance.toString(),
    };
  }
});
