import {
  AccountAddress,
  Aptos,
  InputViewFunctionData,
  MoveFunctionId,
  SimpleTransaction,
  TransactionPayloadMultiSig,
} from "@aptos-labs/ts-sdk";

function multiSigModuleCall(call: string): MoveFunctionId {
  return `0x1::multisig_account::${call}`;
}

/// Utility class for construction multi-sig calls.
/// The usual flow for the transaction executed by multi-sig is as follows:
/// 1. Create multi-sig - one account need to submit transaction creating multi-sig
/// 2. Propose a tx - one account propose transaction
/// 3. Voting on the tx, multi-sig participants either reject or approve transactions
/// 4. If the quorum is met anyone from the multi-sig can execute tx.
export class MultiSigTxBuilder {
  constructor(
    private readonly aptos: Aptos,
    private readonly creator: AccountAddress,
    private readonly signers: AccountAddress[],
    private readonly threshold: number
  ) {}

  async nextMultiSignatureAddress(): Promise<AccountAddress> {
    const payload: InputViewFunctionData = {
      function: multiSigModuleCall("get_next_multisig_account_address"),
      functionArguments: [this.creator.toString()],
    };
    const [multiSigAddress] = await this.aptos.view<[string]>({ payload });

    return AccountAddress.from(multiSigAddress);
  }

  /// Creates tx that creates multi-sig on the chain.
  async createMultiSigTx(): Promise<SimpleTransaction> {
    return await this.aptos.transaction.build.simple({
      sender: this.creator,
      data: {
        function: multiSigModuleCall("create_with_owners"),
        functionArguments: [this.signers, this.threshold, [], []],
      },
    });
  }

  /// Creates tx that propose tx on the chain.
  static async proposeTx(
    aptos: Aptos,
    sender: AccountAddress,
    tx: TransactionPayloadMultiSig
  ): Promise<SimpleTransaction> {
    return await aptos.transaction.build.simple({
      sender,
      data: {
        function: multiSigModuleCall("create_transaction"),
        functionArguments: [
          tx.multiSig.multisig_address,
          tx.multiSig.transaction_payload!.bcsToBytes(),
        ],
      },
    });
  }

  /// Creates tx that accept proposed tx on the chain.
  static async acceptTx(
    aptos: Aptos,
    sender: AccountAddress,
    multisigAddress: AccountAddress,
    txId: number
  ): Promise<SimpleTransaction> {
    return await aptos.transaction.build.simple({
      sender,
      data: {
        function: multiSigModuleCall("approve_transaction"),
        functionArguments: [multisigAddress, txId],
      },
    });
  }

  /// Creates tx that rejects proposed tx on the chain.
  static async rejectTx(
    aptos: Aptos,
    sender: AccountAddress,
    multisigAddress: AccountAddress,
    txId: number
  ): Promise<SimpleTransaction> {
    return await aptos.transaction.build.simple({
      sender,
      data: {
        function: multiSigModuleCall("reject_transaction"),
        functionArguments: [multisigAddress, txId],
      },
    });
  }

  /// Creates tx that execute rejecting txs on the chain.
  static async executeRejectTxs(
    aptos: Aptos,
    sender: AccountAddress,
    multisigAddress: AccountAddress,
    upTo: number
  ): Promise<SimpleTransaction> {
    return await aptos.transaction.build.simple({
      sender,
      data: {
        function: multiSigModuleCall("execute_rejected_transactions"),
        functionArguments: [multisigAddress, upTo],
      },
    });
  }
}
