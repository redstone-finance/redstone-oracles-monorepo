import { Provider } from "@coral-xyz/anchor";
import { SuccessfulTxSimulationResponse } from "@coral-xyz/anchor/dist/cjs/utils/rpc";
import { RedstoneCommon } from "@redstone-finance/utils";
import { Commitment, ConfirmOptions, Connection, PublicKey, SendOptions, Signer, Transaction, TransactionMessage, TransactionSignature, VersionedTransaction } from "@solana/web3.js";


export class AnchorReadonlyProvider implements Provider {
    constructor (readonly connection: Connection) {}

    async simulate(tx: Transaction | VersionedTransaction, _signers?: Signer[], commitment?: Commitment, _includeAccounts?: boolean | PublicKey[]): Promise<SuccessfulTxSimulationResponse> {
        const versionedTransaction = await this.getVersionedTransaction(tx);
        const options = {
            sigVerify: false,
            replaceRecentBlockhash: true,
            commitment,
        }
        const result = await this.connection.simulateTransaction(versionedTransaction, options);

        if (result.value.err) {
            throw new Error(`Simulation failed: ${RedstoneCommon.stringifyError(result.value.err)}`);
        }
        return result.value;
    }

    async getVersionedTransaction(tx: Transaction | VersionedTransaction) {
        if ("version" in tx) {
            return tx;
        }
        tx.recentBlockhash = (await this.connection.getLatestBlockhash()).blockhash;
        tx.feePayer = PublicKey.unique();
        const instructions = TransactionMessage.decompile(tx.compileMessage()).instructions;

        const messageV0 = new TransactionMessage({
            payerKey: tx.feePayer!,
            recentBlockhash: tx.recentBlockhash,
            instructions,
        }).compileToV0Message();
        
        return new VersionedTransaction(messageV0);
    }
}
