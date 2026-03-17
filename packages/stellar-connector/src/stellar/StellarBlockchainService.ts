import { BlockchainService, BlockchainServiceWithTransfer } from "@redstone-finance/multichain-kit";
import { RedstoneCommon } from "@redstone-finance/utils";
import { Keypair } from "@stellar/stellar-sdk";
import { SECS_PER_LEDGER, StellarClient } from "./StellarClient";
import { StellarSigner } from "./StellarSigner";

export class StellarBlockchainService implements BlockchainService {
  constructor(protected readonly client: StellarClient) {}

  async getBlockNumber() {
    return await this.client.getBlockNumber();
  }

  async waitForTransaction(txId: string) {
    try {
      await this.client.waitForTx(txId);

      return true;
    } catch {
      return false;
    }
  }

  async getNormalizedBalance(address: string) {
    const balance = await this.client.getAccountBalance(address);

    const NORMALIZED_BALANCE_MULTIPLIER = 10n ** (18n - 7n);
    return balance * NORMALIZED_BALANCE_MULTIPLIER;
  }

  async getBalance(address: string) {
    return await this.getNormalizedBalance(address);
  }

  async getInstanceTtls(addresses: string[], blockNumber?: number) {
    const curLedger = blockNumber ?? (await this.getBlockNumber());
    const ttlLedgers = await this.client.getInstanceTtls(addresses, curLedger);

    return ttlLedgers.map(
      (ttlLedger) =>
        new Date(
          Date.now() + RedstoneCommon.secsToMs(((ttlLedger ?? 0) - curLedger) * SECS_PER_LEDGER)
        )
    );
  }
}

export class StellarBlockchainServiceWithTransfer
  extends StellarBlockchainService
  implements BlockchainServiceWithTransfer
{
  constructor(
    client: StellarClient,
    private readonly keypair: Keypair
  ) {
    super(client);
  }

  async transfer(toAddress: string, amountInXlm: number) {
    await this.client.transferXlm(new StellarSigner(this.keypair), toAddress, amountInXlm);
  }

  getSignerAddress() {
    return Promise.resolve(this.keypair.publicKey());
  }
}
