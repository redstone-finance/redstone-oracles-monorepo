import { InputGenerateTransactionOptions } from "@aptos-labs/ts-sdk";
import { loggerFactory } from "@redstone-finance/utils";
import { DEFAULT_BROADCAST_BUCKETS } from "./consts";
import { MoveClient } from "./MoveClient";
import { octasToMove } from "./utils";

export class MoveOptionsContractUtil {
  protected static readonly logger = loggerFactory(
    "move-options-contract-util"
  );

  static async prepareTransactionOptions(
    client: MoveClient,
    writePriceOctasTxGasBudget: number,
    iteration: number = 0,
    accountSequenceNumber?: bigint
  ) {
    const gasUnitPrice = await this.computeGasPrice(client, iteration);
    if (!gasUnitPrice) {
      throw new Error("Failed to compute gas price");
    }
    const maxGasAmount = Math.floor(writePriceOctasTxGasBudget / gasUnitPrice);
    this.logger.debug(
      `Max Gas Amount: ${maxGasAmount} units, Max Gas Price: ${octasToMove(maxGasAmount * gasUnitPrice)} Move, Gas Unit Price: ${gasUnitPrice} Octas`
    );

    return {
      maxGasAmount,
      gasUnitPrice,
      accountSequenceNumber,
    } as InputGenerateTransactionOptions;
  }

  private static async computeGasPrice(
    client: MoveClient,
    iteration: number
  ): Promise<number | undefined> {
    const date = Date.now();
    const { gas_estimate: gasPriceEstimation } =
      await client.getGasPriceEstimation();
    this.logger.debug(
      `Reference gas standard price: ${gasPriceEstimation} Octas fetched in ${Date.now() - date} [ms]`
    );

    return iteration === 0
      ? gasPriceEstimation
      : findMatchInPriorityBuckets(gasPriceEstimation, iteration);
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
