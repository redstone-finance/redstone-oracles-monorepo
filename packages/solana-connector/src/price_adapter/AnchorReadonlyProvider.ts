import { Provider } from "@coral-xyz/anchor";
import { SuccessfulTxSimulationResponse } from "@coral-xyz/anchor/dist/cjs/utils/rpc";
import { RedstoneCommon } from "@redstone-finance/utils";
import {
  Commitment,
  Connection,
  PublicKey,
  Signer,
  Transaction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";

export class AnchorReadonlyProvider implements Provider {
  constructor(
    readonly connection: Connection,
    readonly accountForSimulations?: PublicKey
  ) {}

  async simulate(
    tx: Transaction | VersionedTransaction,
    _signers?: Signer[],
    commitment?: Commitment,
    _includeAccounts?: boolean | PublicKey[]
  ): Promise<SuccessfulTxSimulationResponse> {
    const versionedTransaction = await this.getVersionedTransaction(tx);
    const options = {
      sigVerify: false,
      replaceRecentBlockhash: true,
      commitment,
    };
    const result = await this.connection.simulateTransaction(
      versionedTransaction,
      options
    );

    if (result.value.err) {
      throw new Error(
        `Simulation failed: ${RedstoneCommon.stringifyError(result.value.err)}`
      );
    }
    return result.value;
  }

  async getVersionedTransaction(tx: Transaction | VersionedTransaction) {
    if ("version" in tx) {
      return tx;
    }
    tx.recentBlockhash = (await this.connection.getLatestBlockhash()).blockhash;
    tx.feePayer = await this.findSomeAccountWithSol();
    const instructions = TransactionMessage.decompile(
      tx.compileMessage()
    ).instructions;

    const messageV0 = new TransactionMessage({
      payerKey: tx.feePayer,
      recentBlockhash: tx.recentBlockhash,
      instructions,
    }).compileToV0Message();

    return new VersionedTransaction(messageV0);
  }

  async findSomeAccountWithSol() {
    if (this.accountForSimulations) {
      return this.accountForSimulations;
    }

    const account = await this.connection.getSlotLeader();
    return new PublicKey(account);
  }
}
