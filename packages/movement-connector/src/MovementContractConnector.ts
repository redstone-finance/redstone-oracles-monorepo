import { Aptos } from "@aptos-labs/ts-sdk";
import { IContractConnector } from "@redstone-finance/sdk";
import { loggerFactory, RedstoneCommon } from "@redstone-finance/utils";
import { OCTAS_PER_MOVE } from "./consts";

export const TIMEOUT_IN_SEC = 20;

export class MovementContractConnector<Adapter>
  implements IContractConnector<Adapter>
{
  private readonly logger = loggerFactory("movement-contract-connector");

  constructor(protected readonly client: Aptos) {}

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
}
