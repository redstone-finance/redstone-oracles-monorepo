import { ContractParamsProvider } from "@redstone-finance/sdk";
import { Contract, Keypair, rpc } from "@stellar/stellar-sdk";
import { StellarClient, StellarContractUpdater, StellarTransactionExecutor } from "../../src";
import { StellarSigner } from "../../src/stellar/StellarSigner";

const GAS_LIMIT = 100;
const CONFIRMATION_TIMEOUT_MS = 1_000;
const UPDATE_START_TIME_MS = 1_000;
const PREVIOUS_BATCH_HASH = "ab".repeat(32);
const CONTRACT = new Contract("CA526Y2NQWGWVVQ7RFFPGAZMU66PSYJ3UC2MTVAV4ZU7OM5BOPHDXUSG");

describe("StellarContractUpdater", () => {
  let sut: StellarContractUpdater;
  let executor: StellarTransactionExecutor;
  let paramsProvider: ContractParamsProvider;

  beforeEach(() => {
    const keypair = Keypair.random();
    executor = new StellarTransactionExecutor(
      new StellarSigner(keypair),
      new StellarClient(new rpc.Server("https://rpc.stellar.test")),
      GAS_LIMIT,
      CONFIRMATION_TIMEOUT_MS
    );
    sut = new StellarContractUpdater(executor, CONTRACT);
    paramsProvider = new ContractParamsProvider({
      dataServiceId: "redstone-primary-prod",
      uniqueSignersCount: 1,
      authorizedSigners: [],
      dataPackagesIds: ["ETH"],
      authenticatedGateways: [{ apiKey: "test-api-key" }],
    });
    jest.spyOn(paramsProvider, "getPayloadData").mockResolvedValue([]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("drops the previous batch hash on the first attempt", async () => {
    const executeOperation = stubExecuteOperation();

    await sut.update(paramsProvider, makeContext(), 0);

    expect(executeOperation.mock.calls[0][1]).toEqual({ updateStartTimeMs: UPDATE_START_TIME_MS });
  });

  it("keeps the hash of the previous attempt on a retry", async () => {
    const executeOperation = stubExecuteOperation();

    await sut.update(paramsProvider, makeContext(), 1);

    expect(executeOperation.mock.calls[0][1]).toEqual(makeContext());
  });

  function stubExecuteOperation() {
    return jest
      .spyOn(executor, "executeOperation")
      .mockResolvedValue({ hash: PREVIOUS_BATCH_HASH, cost: 0n, baseFee: GAS_LIMIT });
  }

  function makeContext() {
    return { updateStartTimeMs: UPDATE_START_TIME_MS, baseTxHash: PREVIOUS_BATCH_HASH };
  }
});
