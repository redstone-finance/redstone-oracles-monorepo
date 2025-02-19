import { Aptos, InputGenerateTransactionOptions } from "@aptos-labs/ts-sdk";
import { loggerFactory } from "@redstone-finance/utils";
import { DEFAULT_BROADCAST_BUCKETS } from "./consts";
import { octasToMove } from "./utils";

export class MovementOptionsContractUtil {
  protected readonly logger = loggerFactory("movement-options-contract-util");

  constructor(private readonly client: Aptos) {}

  async prepareTransactionOptions(
    writePriceOctasTxGasBudget: number,
    iteration: number = 0
  ): Promise<InputGenerateTransactionOptions | undefined> {
    const gasUnitPrice = await this.computeGasPrice(iteration);
    if (!gasUnitPrice) {
      return;
    }
    const maxGasAmount = Math.floor(writePriceOctasTxGasBudget / gasUnitPrice);
    this.logger.info(
      `Max Gas Amount: ${maxGasAmount} units, Max Gas Price: ${octasToMove(maxGasAmount * gasUnitPrice)} Move, Gas Unit Price: [ ${gasUnitPrice} Octas, ${octasToMove(gasUnitPrice)} Move ]`
    );

    return {
      maxGasAmount,
      gasUnitPrice,
    };
  }

  private async computeGasPrice(
    iteration: number
  ): Promise<number | undefined> {
    const date = Date.now();
    const { gas_estimate: gasStandardPrice } =
      await this.client.getGasPriceEstimation();
    this.logger.info(
      `Reference gas standard price: ${gasStandardPrice} Octas fetched in ${Date.now() - date} [ms]`
    );

    return iteration === 0
      ? gasStandardPrice
      : findMatchInPriorityBuckets(gasStandardPrice, iteration);
  }
}

function findMatchInPriorityBuckets(
  price: number,
  iteration: number
): number | undefined {
  return DEFAULT_BROADCAST_BUCKETS[
    DEFAULT_BROADCAST_BUCKETS.findIndex((v) => v > price) + iteration - 1
  ];
}
