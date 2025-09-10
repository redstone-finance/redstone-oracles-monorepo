import { Connection, PublicKey, TransactionInstruction, TransactionMessage } from "@solana/web3.js";
import {
  accounts,
  getProposalPda,
  getTransactionPda,
  getVaultPda,
  instructions,
  types,
} from "@sqds/multisig";

export class SquadsMultisig {
  constructor(
    private readonly multisigPda: PublicKey,
    private readonly connection: Connection
  ) {}

  async multisigTransactionIndex() {
    const multisigInfo = await accounts.Multisig.fromAccountAddress(
      this.connection,
      this.multisigPda
    );
    return BigInt(Number(multisigInfo.transactionIndex));
  }

  async addMembers(feePayer: PublicKey, newMembers: PublicKey[], newThreshold: number) {
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

    return instructions.configTransactionCreate({
      multisigPda: this.multisigPda,
      transactionIndex,
      creator: feePayer,
      rentPayer: feePayer,
      actions,
    });
  }

  async removeMembers(feePayer: PublicKey, oldMembers: PublicKey[], newThreshold: number) {
    const actions = oldMembers.map(
      (oldMember) =>
        ({
          __kind: "RemoveMember",
          oldMember,
        }) as types.ConfigAction
    );
    actions.push({ __kind: "ChangeThreshold", newThreshold });

    const transactionIndex = (await this.multisigTransactionIndex()) + 1n;

    console.log(`Config actions:`, actions);

    return instructions.configTransactionCreate({
      multisigPda: this.multisigPda,
      transactionIndex,
      creator: feePayer,
      rentPayer: feePayer,
      actions,
    });
  }

  async createVaultTransaction(
    member: PublicKey,
    ix: TransactionInstruction | TransactionInstruction[],
    transactionIdx: bigint | undefined
  ) {
    const vaultPda = this.vaultPda();

    const ixs = Array.isArray(ix) ? ix : [ix];

    console.log(`VaultPda ${vaultPda.toBase58()}, do not forget to top up with some Sol`);

    const transactionIndex = transactionIdx ?? (await this.multisigTransactionIndex()) + 1n;

    console.log(`Create new squads transaction with index = ${transactionIndex}`);

    const transactionMessage = new TransactionMessage({
      payerKey: vaultPda,
      recentBlockhash: (await this.connection.getLatestBlockhash()).blockhash,
      instructions: ixs,
    });

    return instructions.vaultTransactionCreate({
      multisigPda: this.multisigPda,
      transactionIndex,
      creator: member,
      vaultIndex: 0,
      ephemeralSigners: 0,
      transactionMessage,
    });
  }

  async propose(member: PublicKey, transactionIdx: bigint | undefined) {
    const transactionIndex = transactionIdx ?? (await this.multisigTransactionIndex());

    console.log(`Proposing transaction with index = ${transactionIndex}`);

    return instructions.proposalCreate({
      multisigPda: this.multisigPda,
      transactionIndex,
      creator: member,
    });
  }

  async approve(member: PublicKey, transactionIdx: bigint | undefined) {
    const transactionIndex = transactionIdx ?? (await this.multisigTransactionIndex());

    console.log(`Approving squads transaction with index = ${transactionIndex}`);

    return instructions.proposalApprove({
      multisigPda: this.multisigPda,
      transactionIndex,
      member,
    });
  }

  async execute(member: PublicKey, transactionIdx: bigint | undefined) {
    const transactionIndex = transactionIdx ?? (await this.multisigTransactionIndex());

    console.log(`Executing squads transaction with index = ${transactionIndex}`);

    return await instructions.vaultTransactionExecute({
      connection: this.connection,
      multisigPda: this.multisigPda,
      transactionIndex,
      member,
    });
  }

  async executeConfig(member: PublicKey, transactionIdx: bigint | undefined) {
    const transactionIndex = transactionIdx ?? (await this.multisigTransactionIndex());

    console.log(`Executing squads transaction with index = ${transactionIndex}`);

    return instructions.configTransactionExecute({
      multisigPda: this.multisigPda,
      transactionIndex,
      member,
      rentPayer: member,
    });
  }

  async txInfo(txIdx: number) {
    return await accounts.VaultTransaction.fromAccountAddress(this.connection, this.txPda(txIdx));
  }

  vaultPda() {
    const [vaultPda] = getVaultPda({
      multisigPda: this.multisigPda,
      index: 0,
    });

    return vaultPda;
  }

  txPda(txIdx: number) {
    const [transactionPda] = getTransactionPda({
      multisigPda: this.multisigPda,
      index: BigInt(txIdx),
    });

    return transactionPda;
  }

  proposalPda(txIdx: number) {
    const [propPda] = getProposalPda({
      multisigPda: this.multisigPda,
      transactionIndex: BigInt(txIdx),
    });

    return propPda;
  }

  multisigAddress() {
    return this.multisigPda;
  }
}
