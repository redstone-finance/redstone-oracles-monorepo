import {
  Connection,
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
} from "@solana/web3.js";
import * as multisig from "@sqds/multisig";

export class SquadsMultisig {
  constructor(
    private readonly multisigPda: PublicKey,
    private readonly connection: Connection
  ) {}

  async multisigTransactionIndex() {
    const multisigInfo = await multisig.accounts.Multisig.fromAccountAddress(
      this.connection,
      this.multisigPda
    );
    return BigInt(Number(multisigInfo.transactionIndex));
  }

  async createVaultTransaction(
    member: PublicKey,
    ix: TransactionInstruction,
    transactionIdx: bigint | undefined
  ) {
    const vaultPda = this.vaultPda();

    console.log(
      `VaultPda ${vaultPda.toBase58()}, do not forget to top up with some Sol`
    );

    const transactionIndex = transactionIdx
      ? transactionIdx
      : (await this.multisigTransactionIndex()) + 1n;

    console.log(
      `Create new squads transaction with index = ${transactionIndex}`
    );

    const transactionMessage = new TransactionMessage({
      payerKey: vaultPda,
      recentBlockhash: (await this.connection.getLatestBlockhash()).blockhash,
      instructions: [ix],
    });

    return multisig.instructions.vaultTransactionCreate({
      multisigPda: this.multisigPda,
      transactionIndex,
      creator: member,
      vaultIndex: 0,
      ephemeralSigners: 0,
      transactionMessage,
    });
  }

  async propose(member: PublicKey, transactionIdx: bigint | undefined) {
    const transactionIndex = transactionIdx
      ? transactionIdx
      : await this.multisigTransactionIndex();

    console.log(`Proposing transaction with index = ${transactionIndex}`);

    return multisig.instructions.proposalCreate({
      multisigPda: this.multisigPda,
      transactionIndex,
      creator: member,
    });
  }

  async approve(member: PublicKey, transactionIdx: bigint | undefined) {
    const transactionIndex = transactionIdx
      ? transactionIdx
      : await this.multisigTransactionIndex();

    console.log(
      `Approving squads transaction with index = ${transactionIndex}`
    );

    return multisig.instructions.proposalApprove({
      multisigPda: this.multisigPda,
      transactionIndex,
      member,
    });
  }

  async execute(member: PublicKey, transactionIdx: bigint | undefined) {
    const transactionIndex = transactionIdx
      ? transactionIdx
      : await this.multisigTransactionIndex();

    console.log(
      `Executing squads transaction with index = ${transactionIndex}`
    );

    return await multisig.instructions.vaultTransactionExecute({
      connection: this.connection,
      multisigPda: this.multisigPda,
      transactionIndex,
      member,
    });
  }

  vaultPda() {
    const [vaultPda] = multisig.getVaultPda({
      multisigPda: this.multisigPda,
      index: 0,
    });

    return vaultPda;
  }

  multisigAddress() {
    return this.multisigPda;
  }
}
