import {
  Account,
  AccountAddress,
  Aptos,
  TransactionResponse,
} from "@aptos-labs/ts-sdk";
import type {
  IContractConnector,
  IPricesContractAdapter,
} from "@redstone-finance/sdk";
import { loggerFactory, RedstoneCommon } from "@redstone-finance/utils";
import { MovementPricesContractAdapter } from "./MovementPricesContractAdapter";
import { MovementViewContractAdapter } from "./MovementViewContractAdapter";
import { MovementWriteContractAdapter } from "./MovementWriteContractAdapter";
import { IMovementContractAdapter } from "./types";
import { txCost } from "./utils";

export const TIMEOUT_IN_SEC = 20;

export class MovementPricesContractConnector
  implements IContractConnector<IPricesContractAdapter>
{
  private readonly logger = loggerFactory("movement-prices-contract-connector");
  private readonly packageObjectAddress: AccountAddress;
  private readonly priceAdapterObjectAddress: AccountAddress;

  constructor(
    private readonly client: Aptos,
    args: { packageObjectAddress: string; priceAdapterObjectAddress: string },
    private readonly account?: Account
  ) {
    this.packageObjectAddress = AccountAddress.fromString(
      args.packageObjectAddress
    );
    this.priceAdapterObjectAddress = AccountAddress.fromString(
      args.priceAdapterObjectAddress
    );
  }

  getAdapter(): Promise<MovementPricesContractAdapter> {
    const adapter: IMovementContractAdapter = {
      writer: this.account
        ? new MovementWriteContractAdapter(
            this.client,
            this.account,
            this.packageObjectAddress,
            this.priceAdapterObjectAddress
          )
        : undefined,
      viewer: new MovementViewContractAdapter(
        this.client,
        this.packageObjectAddress,
        this.priceAdapterObjectAddress
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
    const cost = txCost(tx);
    this.logger.log(
      `Transaction ${tx.hash} finished, status: COMMITTED, cost: ${cost} MOVE.`
    );
  }
}
