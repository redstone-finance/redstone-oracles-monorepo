import { MoveClient, MoveContractConnector } from "@redstone-finance/move-connector";
import { loggerFactory, RedstoneCommon } from "@redstone-finance/utils";
import { NonEvmBlockchainServiceWithTransfer } from "./NonEvmBlockchainService";

export class MoveBlockchainService extends NonEvmBlockchainServiceWithTransfer {
  private readonly logger = loggerFactory("movement-blockchain-service");

  constructor(
    private client: MoveClient,
    privateKey?: RedstoneCommon.PrivateKey
  ) {
    super(new MoveContractConnector(client, privateKey));
  }

  async getTimeForBlock(blockHeight: number) {
    const block = await this.client.getMultiAptos().getBlockByHeight({ blockHeight });

    return new Date(Math.floor(Number(block.block_timestamp) / 1000));
  }

  async tryGetBlock(blockHeight: number) {
    try {
      return await this.client.getMultiAptos().getBlockByHeight({
        blockHeight,
        options: { withTransactions: true },
      });
    } catch (error) {
      this.logger.error(
        `Error while fetching block #${blockHeight}: ${RedstoneCommon.stringifyError(error)}`
      );

      return undefined;
    }
  }

  async getAccountTransactions(account: string, startBlock: number, endBlock: number) {
    const accountTransactions = await this.getAccountTransactionVersions(
      account,
      startBlock,
      endBlock
    );

    return await Promise.all(
      accountTransactions.user_transactions.map(async (userTransaction) => {
        const tx = await this.getTransactionByVersion(userTransaction.version);

        return {
          tx,
          blockHeight: userTransaction.block_height,
        };
      })
    );
  }

  async getAccountTransactionVersions(account: string, startBlock: number, endBlock: number) {
    const query = `
      query TransactionsForAccountInBlockRange {
        user_transactions(
          distinct_on: sequence_number
          where: {block_height: {_gte: "${startBlock}", _lt: "${endBlock}"}, entry_function_contract_address: {_eq: "${account}"}}
        ) {
          block_height
          version
        }
      }
  `;

    return await this.client.getMultiAptos().queryIndexer<{
      user_transactions: { version: number; block_height: number }[];
    }>({
      query: {
        query,
      },
    });
  }

  async getTransactionByVersion(version: number) {
    return await this.client.getMultiAptos().getTransactionByVersion({
      ledgerVersion: version,
    });
  }
}
