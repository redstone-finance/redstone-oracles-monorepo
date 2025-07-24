import { Aptos } from "@aptos-labs/ts-sdk";
import { MoveContractConnector } from "@redstone-finance/move-connector";
import { loggerFactory, RedstoneCommon } from "@redstone-finance/utils";
import { NonEvmBlockchainService } from "./NonEvmBlockchainService";

export class MoveBlockchainService extends NonEvmBlockchainService {
  private readonly logger = loggerFactory("movement-blockchain-service");

  constructor(
    private client: Aptos,
    privateKey?: RedstoneCommon.PrivateKey
  ) {
    super(new MoveContractConnector(client, privateKey));
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
