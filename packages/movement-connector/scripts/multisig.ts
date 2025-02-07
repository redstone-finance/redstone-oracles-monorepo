import {
  AccountAddress,
  Aptos,
  InputViewFunctionData,
  MoveFunctionId,
  SimpleTransaction,
  TransactionPayloadMultiSig,
} from "@aptos-labs/ts-sdk";

function multisigModuleCall(call: string): MoveFunctionId {
  return `0x1::multisig_account::${call}`;
}

/// Utility class for contstructin multisig calls.
/// The usual flow for the transaction executed by multisig is as follow:
/// 1. Create multisig - one account need to submit transaction creating multisig
/// 2. Propose a tx - one account propose transaction
/// 3. Voting on the tx, multisig participants either reject or approce transationc
/// 4. If the quorum is met anyone from the multisig can execute tx.
export class MultiSigTxBuilder {
  constructor(
    private readonly aptos: Aptos,
    private readonly creator: AccountAddress,
    private readonly additionalSigners: AccountAddress[],
    private readonly threshold: number
  ) {}

  public async nextMultiSignatureAddress(): Promise<AccountAddress> {
    const payload: InputViewFunctionData = {
      function: multisigModuleCall("get_next_multisig_account_address"),
      functionArguments: [this.creator.toString()],
    };
    const [multisigAddress] = await this.aptos.view<[string]>({ payload });

    return AccountAddress.from(multisigAddress);
  }

  /// Creates tx that creates multisig on the chain.
  public async createMultiSigTx(): Promise<SimpleTransaction> {
    return await this.aptos.transaction.build.simple({
      sender: this.creator,
      data: {
        function: multisigModuleCall("create_with_owners"),
        functionArguments: [this.additionalSigners, this.threshold, [], []],
      },
    });
  }

  /// Creates tx that propose tx on the chain.
  public async proposeTx(
    sender: AccountAddress,
    tx: TransactionPayloadMultiSig
  ): Promise<SimpleTransaction> {
    return await this.aptos.transaction.build.simple({
      sender,
      data: {
        function: multisigModuleCall("create_transaction"),
        functionArguments: [
          tx.multiSig.multisig_address,
          tx.multiSig.transaction_payload!.bcsToBytes(),
        ],
      },
    });
  }

  /// Creates tx that accept proposed tx on the chain.
  public async acceptTx(
    sender: AccountAddress,
    multisigAddress: AccountAddress,
    txId: number
  ): Promise<SimpleTransaction> {
    return await this.aptos.transaction.build.simple({
      sender,
      data: {
        function: multisigModuleCall("approve_transaction"),
        functionArguments: [multisigAddress, txId],
      },
    });
  }
}
