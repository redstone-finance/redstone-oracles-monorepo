import {
  Connection,
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
} from "@solana/web3.js";
import * as multisig from "@sqds/multisig";
import { types } from "@sqds/multisig";

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

  async addMembers(
    feePayer: PublicKey,
    newMembers: PublicKey[],
    newThreshold: number
  ) {
    const actions = newMembers.map(
      (newMember) =>
        ({
          __kind: "AddMember",
          newMember: {
            key: newMember,
            permissions: types.Permissions.all(),
          },
        }) as types.ConfigAction
    );
    actions.push({ __kind: "ChangeThreshold", newThreshold });

    const transactionIndex = (await this.multisigTransactionIndex()) + 1n;

    console.log(`Config actions:`, actions);

    return multisig.instructions.configTransactionCreate({
      multisigPda: this.multisigPda,
      transactionIndex,
      creator: feePayer,
      rentPayer: feePayer,
      actions,
    });
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

    const transactionIndex =
      transactionIdx ?? (await this.multisigTransactionIndex()) + 1n;

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
    const transactionIndex =
      transactionIdx ?? (await this.multisigTransactionIndex());

    console.log(`Proposing transaction with index = ${transactionIndex}`);

    return multisig.instructions.proposalCreate({
      multisigPda: this.multisigPda,
      transactionIndex,
      creator: member,
    });
  }

  async approve(member: PublicKey, transactionIdx: bigint | undefined) {
    const transactionIndex =
      transactionIdx ?? (await this.multisigTransactionIndex());

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
    const transactionIndex =
      transactionIdx ?? (await this.multisigTransactionIndex());

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

  async executeConfig(member: PublicKey, transactionIdx: bigint | undefined) {
    const transactionIndex =
      transactionIdx ?? (await this.multisigTransactionIndex());

    console.log(
      `Executing squads transaction with index = ${transactionIndex}`
    );

    return multisig.instructions.configTransactionExecute({
      multisigPda: this.multisigPda,
      transactionIndex,
      member,
      rentPayer: member,
    });
  }

  async txInfo(txIdx: number) {
    return await multisig.accounts.VaultTransaction.fromAccountAddress(
      this.connection,
      this.txPda(txIdx)
    );
  }

  vaultPda() {
    const [vaultPda] = multisig.getVaultPda({
      multisigPda: this.multisigPda,
      index: 0,
    });

    return vaultPda;
  }

  txPda(txIdx: number) {
    const [transactionPda] = multisig.getTransactionPda({
      multisigPda: this.multisigPda,
      index: BigInt(txIdx),
    });

    return transactionPda;
  }

  multisigAddress() {
    return this.multisigPda;
  }
}
