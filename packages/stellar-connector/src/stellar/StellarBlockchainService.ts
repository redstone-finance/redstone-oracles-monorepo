import {
  BlockchainServiceWithTransfer,
  BlockchainServiceWithTxLookup,
} from "@redstone-finance/multichain-kit";
import { RedstoneCommon } from "@redstone-finance/utils";
import { Keypair } from "@stellar/stellar-sdk";
import { SECS_PER_LEDGER, StellarClient } from "../client/StellarClient";
import { StellarSigner } from "./StellarSigner";
import { StellarTxLookup } from "./StellarTxLookup";

export class StellarBlockchainService implements BlockchainServiceWithTxLookup {
  constructor(protected readonly client: StellarClient) {}

  get txLookup() {
    return new StellarTxLookup(this.client);
  }

  async getBlockNumber() {
    return await this.client.getBlockNumber();
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

  async getTimeForBlock(sequence: number) {
    return await this.client.getTimeForBlock(sequence);
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
