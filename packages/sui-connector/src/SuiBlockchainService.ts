import { SuiClient } from "@mysten/sui/client";
import { Keypair } from "@mysten/sui/cryptography";
import { Transaction } from "@mysten/sui/transactions";
import { MIST_PER_SUI } from "@mysten/sui/utils";
import { BlockchainService, BlockchainServiceWithTransfer } from "@redstone-finance/multichain-kit";
import { SuiContractUpdater } from "./SuiContractUpdater";

export class SuiBlockchainService implements BlockchainService {
  constructor(protected readonly client: SuiClient) {}

  async getBlockNumber(): Promise<number> {
    return Number(await this.client.getLatestCheckpointSequenceNumber());
  }

  async getNormalizedBalance(address: string): Promise<bigint> {
    return (
      BigInt((await this.client.getBalance({ owner: address })).totalBalance) *
      (10n ** 18n / MIST_PER_SUI)
    );
  }

  async waitForTransaction(txId: string): Promise<boolean> {
    await this.client.waitForTransaction({ digest: txId });
    const response = await this.client.getTransactionBlock({
      digest: txId,
      options: {
        showEffects: true,
        showEvents: true,
      },
    });

    return SuiContractUpdater.getStatus(response).success;
  }

  async getBalance(address: string) {
    return await this.getNormalizedBalance(address);
  }
}

export class SuiBlockchainServiceWithTransfer
  extends SuiBlockchainService
  implements BlockchainServiceWithTransfer
{
  constructor(
    client: SuiClient,
    private readonly keypair: Keypair
  ) {
    super(client);
  }

  async transfer(toAddress: string, amount: number): Promise<void> {
    amount = amount * 10 ** 9;

    const tx = new Transaction();
    const [coin] = tx.splitCoins(tx.gas, [amount]);
    tx.transferObjects([coin], toAddress);

    const resp = await this.client.signAndExecuteTransaction({
      signer: this.keypair,
      transaction: tx,
    });

    await this.waitForTransaction(resp.digest);
  }

  getSignerAddress(): Promise<string> {
    return Promise.resolve(this.keypair.toSuiAddress());
  }
}
