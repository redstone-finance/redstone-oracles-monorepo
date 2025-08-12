import { Account, PrivateKeyVariants } from "@aptos-labs/ts-sdk";
import { IContractConnector } from "@redstone-finance/sdk";
import { loggerFactory, RedstoneCommon } from "@redstone-finance/utils";
import { OCTAS_PER_MOVE } from "./consts";
import { MoveClient } from "./MoveClient";
import { makeAptosAccount } from "./utils";

export const TIMEOUT_IN_SEC = 20;

export class MoveContractConnector<Adapter>
  implements IContractConnector<Adapter>
{
  private readonly logger = loggerFactory("move-contract-connector");
  private readonly account?: Account;

  constructor(
    protected readonly client: MoveClient,
    privateKey?: RedstoneCommon.PrivateKey
  ) {
    if (privateKey) {
      this.account = makeAptosAccount(
        privateKey.value,
        privateKey.scheme as PrivateKeyVariants
      );
    }
  }

  getAdapter(): Promise<Adapter> {
    throw new Error("getAdapter is not implemented");
  }

  async getBlockNumber(): Promise<number> {
    return await this.client.getBlockNumber();
  }

  async waitForTransaction(txId: string): Promise<boolean> {
    try {
      const committedTx = await this.client.waitForTransaction(txId);

      return committedTx.success;
    } catch (exception) {
      this.logger.error(
        `Failed to validate transaction state: ${RedstoneCommon.stringifyError(exception)}`
      );
    }

    return false;
  }

  async getNormalizedBalance(address: string): Promise<bigint> {
    return (
      BigInt(await this.client.getBalance(address)) *
      BigInt(10 ** 18 / OCTAS_PER_MOVE)
    );
  }

  async transfer(toAddress: string, amount: number) {
    if (!this.account) {
      throw new Error("Private Key was not provided.");
    }
    amount = amount * OCTAS_PER_MOVE;

    await this.client.sendSimpleTransaction(
      {
        function: "0x1::aptos_account::transfer",
        typeArguments: [],
        functionArguments: [toAddress, amount],
      },
      this.account
    );
  }

  getSignerAddress() {
    if (!this.account) {
      throw new Error("Private Key was not provided.");
    }
    return Promise.resolve(this.account.accountAddress.toString());
  }
}
