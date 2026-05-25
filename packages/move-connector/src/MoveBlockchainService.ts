import { Account, PrivateKeyVariants } from "@aptos-labs/ts-sdk";
import { RedstoneCommon } from "@redstone-finance/utils";
import { OCTAS_PER_MOVE } from "./consts";
import { MoveClient } from "./MoveClient";
import { MoveTxLookup } from "./MoveTxLookup";
import { makeAptosAccount } from "./utils";

export class MoveBlockchainService {
  private readonly account?: Account;

  constructor(
    protected readonly client: MoveClient,
    privateKey?: RedstoneCommon.PrivateKey
  ) {
    if (privateKey) {
      this.account = makeAptosAccount(privateKey.value, privateKey.scheme as PrivateKeyVariants);
    }
  }

  get txLookup() {
    return new MoveTxLookup(this.client);
  }

  async getBlockNumber() {
    return await this.client.getBlockNumber();
  }

  async getNormalizedBalance(address: string) {
    return BigInt(await this.client.getBalance(address)) * BigInt(10 ** 18 / OCTAS_PER_MOVE);
  }

  async transfer(toAddress: string, amount: number) {
    if (!this.account) {
      throw new Error("Private Key was not provided.");
    }

    await this.client.sendSimpleTransaction(
      {
        function: "0x1::aptos_account::transfer",
        typeArguments: [],
        functionArguments: [toAddress, amount * OCTAS_PER_MOVE],
      },
      this.account
    );
  }

  async getBalance(address: string) {
    return await this.getNormalizedBalance(address);
  }

  getSignerAddress() {
    if (!this.account) {
      throw new Error("Private Key was not provided.");
    }

    return Promise.resolve(this.account.accountAddress.toString());
  }

  async getTimeForBlock(blockHeight: number) {
    const block = await this.client.getMultiAptos().getBlockByHeight({ blockHeight });

    return new Date(Math.floor(Number(block.block_timestamp) / 1000));
  }
}
