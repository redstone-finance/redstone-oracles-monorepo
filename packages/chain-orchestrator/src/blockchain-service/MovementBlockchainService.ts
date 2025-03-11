import { Aptos } from "@aptos-labs/ts-sdk";
import { MovementContractConnector } from "@redstone-finance/movement-connector";
import { loggerFactory, RedstoneCommon } from "@redstone-finance/utils";
import { NonEvmBlockchainService } from "./NonEvmBlockchainService";

export class MovementBlockchainService extends NonEvmBlockchainService {
  private readonly logger = loggerFactory("movement-blockchain-service");

  constructor(private client: Aptos) {
    super(new MovementContractConnector(client));
  }

  async getTimeForBlock(blockHeight: number) {
    const block = await this.client.getBlockByHeight({ blockHeight });

    return new Date(Math.floor(Number(block.block_timestamp) / 1000));
  }

  async tryGetBlock(blockHeight: number) {
    try {
      return await this.client.getBlockByHeight({
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
}
