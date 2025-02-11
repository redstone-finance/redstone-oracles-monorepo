import {
  Account,
  AccountAddress,
  Aptos,
  createObjectAddress,
  TransactionResponse,
  TransactionResponseType,
} from "@aptos-labs/ts-sdk";
import type {
  IContractConnector,
  IPricesContractAdapter,
} from "@redstone-finance/sdk";
import { loggerFactory, RedstoneCommon } from "@redstone-finance/utils";
import {
  MovementPricesContractAdapter,
  SEED,
} from "./MovementPricesContractAdapter";
import { MovementViewContractAdapter } from "./MovementViewContractAdapter";
import { MovementWriteContractAdapter } from "./MovementWriteContractAdapter";
import { IMovementContractAdapter } from "./types";

export const TIMEOUT_IN_SEC = 20;

export class MovementPricesContractConnector
  implements IContractConnector<IPricesContractAdapter>
{
  private readonly logger = loggerFactory("movement-prices-contract-connector");

  constructor(
    private readonly client: Aptos,
    private readonly account: Account,
    private readonly packageObjectAddress: AccountAddress
  ) {}

  getAdapter(): Promise<MovementPricesContractAdapter> {
    const priceAdapterObjectAddress: AccountAddress = createObjectAddress(
      this.account.accountAddress,
      SEED
    );

    const adapter: IMovementContractAdapter = {
      writer: new MovementWriteContractAdapter(
        this.client,
        this.account,
        this.packageObjectAddress,
        priceAdapterObjectAddress
      ),
      viewer: new MovementViewContractAdapter(
        this.client,
        this.packageObjectAddress,
        priceAdapterObjectAddress
      ),
    };

    return Promise.resolve(new MovementPricesContractAdapter(adapter));
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
      if (committedTx.success) {
        this.processCommittedTransactionCost(committedTx);

        return true;
      }
    } catch (exception) {
      this.logger.error(
        `Failed to validate transaction state: ${RedstoneCommon.stringifyError(exception)}`
      );
    }

    return false;
  }

  private processCommittedTransactionCost(tx: TransactionResponse) {
    const cost = MovementPricesContractConnector.getCost(tx);
    this.logger.log(
      `Transaction ${tx.hash} finished, status: COMMITTED, cost: ${cost} MOVE.`
    );
  }

  private static getCost(response: TransactionResponse): number {
    return response.type === TransactionResponseType.Pending
      ? 0
      : parseInt(response.gas_used);
  }
}
