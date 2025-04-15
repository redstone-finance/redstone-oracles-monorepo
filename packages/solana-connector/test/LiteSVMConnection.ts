import {
  AccountInfo,
  BlockhashWithExpiryBlockHeight,
  clusterApiUrl,
  Connection,
  Message,
  PublicKey,
  RecentPrioritizationFees,
  RpcResponseAndContext,
  SignatureStatus,
  SimulatedTransactionResponse,
  Transaction,
  TransactionMessage,
  TransactionSignature,
  VersionedTransaction,
} from "@solana/web3.js";
import bs58 from "bs58";
import {
  FailedTransactionMetadata,
  LiteSVM,
  TransactionMetadata,
} from "litesvm";
import { toNumber } from "../src";

const DUMMY_CONTEXT = { slot: 0 };
const DUMMY_SIGNATURE =
  "4bR5v2jR3iB6veTsiGEhdWmuheiexBqL53ukNyimvm4qE5vZ6JaZtCejuL9kDkTHp928ycp5jTv5YZiC9hEWJBEW";
const DEFAULT_FEE = { ...DUMMY_CONTEXT, prioritizationFee: 0 };

type Status = "confirmed" | "finalized" | "error";

function transactionStatus(status: Status) {
  switch (status) {
    case "confirmed":
    case "finalized":
      return {
        value: {
          ...DUMMY_CONTEXT,
          confirmations: 100,
          confirmationStatus: status,
          err: null,
        },
        context: DUMMY_CONTEXT,
      };
    case "error":
      return {
        value: {
          ...DUMMY_CONTEXT,
          confirmations: 100,
          err: "Error :D",
        },
        context: DUMMY_CONTEXT,
      };
  }
}

export class ConnectionStateScenario {
  recentFees: RecentPrioritizationFees[][] = [];
  signatureStatus: Status[] = [];
  submitTransaction: boolean[] = [];
  updateBlockHash: boolean[] = [];

  fees: number[] = [];

  constructor(public svm: LiteSVM) {}

  thenSubmit() {
    this.submitTransaction.push(true);

    return this;
  }

  thenDontSubmit() {
    this.submitTransaction.push(false);

    return this;
  }

  thenDontSubmitAndErrorFor(n: number) {
    while (n > 0) {
      this.thenDontSubmit().thenTransactionStatus("error");
      n--;
    }

    return this;
  }

  thenTransactionStatus(...status: Status[]) {
    this.signatureStatus.push(...status);

    return this;
  }

  thenSetRecentFee(fees: number[]) {
    this.recentFees.push(
      fees.map((prioritizationFee) => ({ ...DUMMY_CONTEXT, prioritizationFee }))
    );

    return this;
  }

  thenProceedBlockHash(...proceed: boolean[]) {
    this.updateBlockHash.push(...proceed);

    return this;
  }

  getFee() {
    const fee = this.recentFees.shift();

    return fee === undefined ? [DEFAULT_FEE] : fee;
  }

  shouldSubmit() {
    const submit = this.submitTransaction.shift();

    return submit === undefined ? true : submit;
  }

  shouldUpdateBlockHash() {
    const update = this.updateBlockHash.shift();

    return update === undefined ? true : update;
  }

  status() {
    const status = this.signatureStatus.shift();

    return transactionStatus(status === undefined ? "confirmed" : status);
  }

  setClock(timestampMilliseconds: number) {
    const clock = this.svm.getClock();
    clock.unixTimestamp = BigInt(Math.floor(timestampMilliseconds / 1000));
    this.svm.setClock(clock);

    return this;
  }

  advanceClock(bySeconds: number) {
    const clock = this.svm.getClock();
    clock.unixTimestamp += BigInt(bySeconds);
    this.svm.setClock(clock);

    return this;
  }

  priorityFeesSet(tx: VersionedTransaction) {
    const msg = TransactionMessage.decompile(tx.message);

    const feeInstruction = msg.instructions
      .filter(
        (instr) =>
          instr.programId.toBase58() ===
          new PublicKey(
            "ComputeBudget111111111111111111111111111111"
          ).toBase58()
      )
      .find((instr) => instr.data[0] === 3)!;

    const data = feeInstruction.data;
    const bigEndian = data.subarray(1).reverse();

    this.fees.push(toNumber(Array.from(bigEndian)));
  }
}

export class LiteSVMConnection extends Connection {
  constructor(private readonly state: ConnectionStateScenario) {
    super(clusterApiUrl());
  }

  override getSlot(): Promise<number> {
    return Promise.resolve(Number(this.state.svm.getSlotHistory().newest()));
  }

  override getSignatureStatus(
    signature: string
  ): Promise<RpcResponseAndContext<SignatureStatus | null>> {
    const tx = this.state.svm.getTransaction(bs58.decode(signature));

    if (tx instanceof FailedTransactionMetadata) {
      return Promise.resolve({
        context: DUMMY_CONTEXT,
        value: {
          confirmations: 100,
          slot: 0,
          err: tx.err(),
          confirmationStatus: "confirmed",
        },
      });
    }

    return Promise.resolve(this.state.status());
  }

  override getRecentPrioritizationFees(): Promise<RecentPrioritizationFees[]> {
    return Promise.resolve(this.state.getFee());
  }

  override getLatestBlockhash(): Promise<BlockhashWithExpiryBlockHeight> {
    if (this.state.shouldUpdateBlockHash()) {
      this.state.svm.expireBlockhash();
    }
    return Promise.resolve({
      lastValidBlockHeight: 0,
      blockhash: this.state.svm.latestBlockhash(),
    });
  }

  override getAccountInfo(
    publicKey: PublicKey
  ): Promise<AccountInfo<Buffer> | null> {
    const accountData = this.state.svm.getAccount(publicKey);

    if (accountData === null) {
      return Promise.resolve(null);
    }

    return Promise.resolve({
      ...accountData,
      data: Buffer.from(accountData.data),
    });
  }

  override simulateTransaction(
    transactionOrMessage: VersionedTransaction | Transaction | Message
  ): Promise<RpcResponseAndContext<SimulatedTransactionResponse>> {
    if (transactionOrMessage instanceof Message) {
      throw new Error("Message unsupported.");
    }

    const simulationResult =
      this.state.svm.simulateTransaction(transactionOrMessage);

    if (simulationResult instanceof FailedTransactionMetadata) {
      return Promise.resolve({
        context: DUMMY_CONTEXT,
        value: {
          err: simulationResult.err(),
          logs: [],
        },
      });
    }

    return Promise.resolve({
      context: DUMMY_CONTEXT,
      value: {
        err: null,
        logs: simulationResult.meta().logs(),
        accounts: null,
        unitsConsumed: 0,
        returnData: {
          programId: bs58.encode(
            simulationResult.meta().returnData().programId()
          ),
          data: [
            Buffer.from(simulationResult.meta().returnData().data()).toString(
              "base64"
            ),
            "base64",
          ],
        },
        innerInstructions: [],
      },
    });
  }

  override sendTransaction(
    transaction: VersionedTransaction | Transaction
  ): Promise<TransactionSignature> {
    if (transaction instanceof Transaction) {
      throw new Error("Unsupported");
    }
    this.state.priorityFeesSet(transaction);

    if (!this.state.shouldSubmit()) {
      return Promise.resolve(DUMMY_SIGNATURE);
    }
    const response = this.state.svm.sendTransaction(transaction);

    if (response instanceof TransactionMetadata) {
      return Promise.resolve(bs58.encode(response.signature()));
    } else {
      throw new Error(response.err().toString());
    }
  }
}
