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
  TransactionSignature,
  VersionedTransaction,
} from "@solana/web3.js";
import bs58 from "bs58";
import { FailedTransactionMetadata, LiteSVM, TransactionMetadata } from "litesvm";
import { DEFAULT_FEE, DUMMY_CONTEXT, transactionStatus } from "../utils";

export class LiteSVMAgnosticTestsConnection extends Connection {
  constructor(private readonly svm: LiteSVM) {
    super(clusterApiUrl());
  }

  override getSlot(): Promise<number> {
    return Promise.resolve(Number(this.svm.getSlotHistory().newest()));
  }

  override getAccountInfoAndContext(
    publicKey: PublicKey
  ): Promise<RpcResponseAndContext<AccountInfo<Buffer> | null>> {
    const account = this.svm.getAccount(publicKey);

    if (account === null) {
      throw new Error("no account found");
    }

    return Promise.resolve({
      context: DUMMY_CONTEXT,
      value: {
        executable: account.executable,
        owner: account.owner,
        lamports: account.lamports,
        data: Buffer.from(account.data),
      },
    });
  }

  override async getSignatureStatus(
    signature: string
  ): Promise<RpcResponseAndContext<SignatureStatus | null>> {
    const tx = this.svm.getTransaction(bs58.decode(signature));

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

    return transactionStatus("confirmed");
  }

  override getRecentPrioritizationFees(): Promise<RecentPrioritizationFees[]> {
    return Promise.resolve([DEFAULT_FEE]);
  }

  override getLatestBlockhash(): Promise<BlockhashWithExpiryBlockHeight> {
    return Promise.resolve({
      lastValidBlockHeight: 0,
      blockhash: this.svm.latestBlockhash(),
    });
  }

  override getAccountInfo(publicKey: PublicKey): Promise<AccountInfo<Buffer> | null> {
    const accountData = this.svm.getAccount(publicKey);

    if (accountData === null) {
      return Promise.resolve(null);
    }

    return Promise.resolve({
      ...accountData,
      data: Buffer.from(accountData.data),
    });
  }

  override getMultipleAccountsInfo(
    publicKeys: PublicKey[]
  ): Promise<(AccountInfo<Buffer> | null)[]> {
    return Promise.all(publicKeys.map((publicKey) => this.getAccountInfo(publicKey)));
  }

  override async simulateTransaction(
    transactionOrMessage: VersionedTransaction | Transaction | Message
  ): Promise<RpcResponseAndContext<SimulatedTransactionResponse>> {
    if (transactionOrMessage instanceof Message) {
      throw new Error("Message unsupported.");
    }

    const simulationResult = this.svm.simulateTransaction(transactionOrMessage);

    if (simulationResult instanceof FailedTransactionMetadata) {
      return await Promise.resolve({
        context: DUMMY_CONTEXT,
        value: {
          err: simulationResult.err(),
          logs: [],
        },
      });
    }

    return await Promise.resolve({
      context: DUMMY_CONTEXT,
      value: {
        err: null,
        logs: simulationResult.meta().logs(),
        accounts: null,
        unitsConsumed: 0,
        returnData: {
          programId: bs58.encode(simulationResult.meta().returnData().programId()),
          data: [
            Buffer.from(simulationResult.meta().returnData().data()).toString("base64"),
            "base64",
          ],
        },
        innerInstructions: [],
      },
    });
  }

  override async sendTransaction(
    transaction: VersionedTransaction | Transaction
  ): Promise<TransactionSignature> {
    if (transaction instanceof Transaction) {
      throw new Error("Unsupported");
    }
    const response = this.svm.sendTransaction(transaction);

    if (response instanceof TransactionMetadata) {
      return await Promise.resolve(bs58.encode(response.signature()));
    } else {
      throw new Error(response.err().toString());
    }
  }
}
