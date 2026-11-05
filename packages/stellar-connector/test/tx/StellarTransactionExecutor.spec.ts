import {
  Account,
  Contract,
  Keypair,
  Networks,
  rpc,
  TransactionBuilder,
  xdr,
} from "@stellar/stellar-sdk";
import { StellarClient, StellarTransactionExecutor } from "../../src";
import { StellarSigner } from "../../src/stellar/StellarSigner";

const GAS_LIMIT = 100;
const CONFIRMATION_TIMEOUT_MS = 1_000;
const LATEST_LEDGER = 10;
const FOREIGN_HASH = "ab".repeat(32);
const OPERATION = new Contract("CA526Y2NQWGWVVQ7RFFPGAZMU66PSYJ3UC2MTVAV4ZU7OM5BOPHDXUSG").call(
  "write_prices"
);

describe("StellarTransactionExecutor", () => {
  let client: StellarClient;
  let sut: StellarTransactionExecutor;
  let ownHash: string;

  beforeEach(() => {
    const keypair = Keypair.random();
    const transaction = new TransactionBuilder(new Account(keypair.publicKey(), "1"), {
      fee: String(GAS_LIMIT),
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(OPERATION)
      .setTimeout(0)
      .build();
    ownHash = transaction.hash().toString("hex");

    client = new StellarClient(new rpc.Server("https://rpc.stellar.test"));
    sut = new StellarTransactionExecutor(
      new StellarSigner(keypair),
      client,
      GAS_LIMIT,
      CONFIRMATION_TIMEOUT_MS
    );
    jest.spyOn(client, "prepareSignedTransaction").mockResolvedValue(transaction);
    jest.spyOn(client, "getNetworkStats").mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("confirms the transaction it signed", async () => {
    stubPendingResponse(ownHash);
    stubConfirmation();

    const { hash } = await sut.executeOperation(OPERATION, {});

    expect(hash).toBe(ownHash);
  });

  it("rejects a response carrying another transaction hash", async () => {
    stubPendingResponse(FOREIGN_HASH);
    const getTransaction = stubConfirmation();

    await expect(sut.executeOperation(OPERATION, {})).rejects.toThrow(FOREIGN_HASH);
    expect(getTransaction).toHaveBeenCalledTimes(0);
  });

  function stubConfirmation() {
    return jest.spyOn(client, "getTransaction").mockResolvedValue({
      status: rpc.Api.GetTransactionStatus.SUCCESS,
      cost: new xdr.Int64(GAS_LIMIT),
      value: undefined,
    });
  }

  function stubPendingResponse(hash: string) {
    jest.spyOn(client, "sendTransaction").mockResolvedValue({
      status: "PENDING",
      hash,
      latestLedger: LATEST_LEDGER,
      latestLedgerCloseTime: LATEST_LEDGER,
    });
  }
});
