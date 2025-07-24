import { Account, Aptos, PrivateKeyVariants } from "@aptos-labs/ts-sdk";
import { IContractConnector } from "@redstone-finance/sdk";
import { loggerFactory, RedstoneCommon } from "@redstone-finance/utils";
import { OCTAS_PER_MOVE } from "./consts";
import { makeAptosAccount } from "./utils";

export const TIMEOUT_IN_SEC = 20;

export class MoveContractConnector<Adapter>
  implements IContractConnector<Adapter>
{
  private readonly logger = loggerFactory("move-contract-connector");
  private readonly account?: Account;

  constructor(
    protected readonly client: Aptos,
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
    return Number((await this.client.getLedgerInfo()).block_height);
  }

  async waitForTransaction(txId: string): Promise<boolean> {
    try {
      const committedTx = await this.client.waitForTransaction({
        transactionHash: txId,
        options: {
          timeoutSecs: TIMEOUT_IN_SEC,
        },
      });

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
      BigInt(
        await this.client.account.getAccountAPTAmount({
          accountAddress: address,
        })
      ) * BigInt(10 ** 18 / OCTAS_PER_MOVE)
    );
  }

  async transfer(toAddress: string, amount: number) {
    if (!this.account) {
      throw new Error("Private Key was not provided.");
    }
    amount = amount * OCTAS_PER_MOVE;

    const transaction = await this.client.transaction.build.simple({
      sender: this.account.accountAddress,
      data: {
        function: "0x1::aptos_account::transfer",
        typeArguments: [],
        functionArguments: [toAddress, amount],
      },
    });

    await this.client.signAndSubmitTransaction({
      signer: this.account,
      transaction,
    });
  }

  getSignerAddress() {
    if (!this.account) {
      throw new Error("Private Key was not provided.");
    }
    return Promise.resolve(this.account.accountAddress.toString());
  }
}
