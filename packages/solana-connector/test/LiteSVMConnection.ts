import {
  BlockhashWithExpiryBlockHeight,
  PublicKey,
  RecentPrioritizationFees,
  RpcResponseAndContext,
  SignatureStatus,
  Transaction,
  TransactionMessage,
  TransactionSignature,
  VersionedTransaction,
} from "@solana/web3.js";
import bs58 from "bs58";
import { FailedTransactionMetadata, LiteSVM, TransactionMetadata } from "litesvm";
import { toNumber } from "../src";
import { LiteSVMAgnosticTestsConnection } from "./chain-agnostic/TestConnection";
import { DEFAULT_FEE, DUMMY_CONTEXT, DUMMY_SIGNATURE, Status, transactionStatus } from "./utils";

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

    return fee ?? [DEFAULT_FEE];
  }

  shouldSubmit() {
    const submit = this.submitTransaction.shift();

    return submit ?? true;
  }

  shouldUpdateBlockHash() {
    const update = this.updateBlockHash.shift();

    return update ?? true;
  }

  status() {
    const status = this.signatureStatus.shift();

    return transactionStatus(status ?? "confirmed");
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
          new PublicKey("ComputeBudget111111111111111111111111111111").toBase58()
      )
      .find((instr) => instr.data[0] === 3)!;

    const data = feeInstruction.data;
    const bigEndian = data.subarray(1).reverse();

    this.fees.push(toNumber(Array.from(bigEndian)));
  }
}

export class LiteSVMConnection extends LiteSVMAgnosticTestsConnection {
  constructor(private readonly state: ConnectionStateScenario) {
    super(state.svm);
  }

  override getSlot(): Promise<number> {
    return Promise.resolve(Number(this.state.svm.getSlotHistory().newest()));
  }

  override async getSignatureStatus(
    signature: string
  ): Promise<RpcResponseAndContext<SignatureStatus | null>> {
    const tx = this.state.svm.getTransaction(bs58.decode(signature));

    if (tx instanceof FailedTransactionMetadata) {
      return await Promise.resolve({
        context: DUMMY_CONTEXT,
        value: {
          confirmations: 100,
          slot: 0,
          err: tx.err(),
          confirmationStatus: "confirmed",
        },
      });
    }

    return await Promise.resolve(this.state.status());
  }

  override getRecentPrioritizationFees(): Promise<RecentPrioritizationFees[]> {
    return Promise.resolve(this.state.getFee());
  }

  override getLatestBlockhash(): Promise<BlockhashWithExpiryBlockHeight> {
    if (this.state.shouldUpdateBlockHash()) {
      this.state.svm.expireBlockhash();
    }

    return super.getLatestBlockhash();
  }

  override async sendTransaction(
    transaction: VersionedTransaction | Transaction
  ): Promise<TransactionSignature> {
    if (transaction instanceof Transaction) {
      throw new Error("Unsupported");
    }
    this.state.priorityFeesSet(transaction);

    if (!this.state.shouldSubmit()) {
      return await Promise.resolve(DUMMY_SIGNATURE);
    }
    const response = this.state.svm.sendTransaction(transaction);

    if (response instanceof TransactionMetadata) {
      return await Promise.resolve(bs58.encode(response.signature()));
    } else {
      throw new Error(response.err().toString());
    }
  }
}
