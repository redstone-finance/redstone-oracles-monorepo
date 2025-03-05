import { MoveFunctionId, MoveVector } from "@aptos-labs/ts-sdk";
import { SplitPayloads } from "@redstone-finance/sdk";
import {
  MovementTransactionData,
  MovementTxDeliveryMan,
} from "../MovementTxDeliveryMan";
import { makeFeedIdBytes } from "../utils";

export class MovementPriceAdapterContractWriter {
  constructor(
    private readonly txDeliveryMan: MovementTxDeliveryMan,
    private readonly priceAdapterPackageAddress: string,
    private readonly priceAdapterObjectAddress: string
  ) {}

  getSignerAddress() {
    return this.txDeliveryMan.getSignerAddress();
  }

  async writePrices(
    payloads: SplitPayloads<string>,
    deferredDataRequest?: (feedId: string) => Promise<string>
  ) {
    const data = Object.entries(payloads).map(async ([feedId, payload]) => {
      const data: MovementTransactionData =
        await this.makeWritePriceTransactionData(
          feedId,
          Promise.resolve(payload)
        );

      if (deferredDataRequest) {
        data.deferredDataProvider = () =>
          this.makeWritePriceTransactionData(
            feedId,
            deferredDataRequest(feedId)
          );
      }

      return data;
    });

    return await this.txDeliveryMan.sendBatchTransactions(data);
  }

  private async makeWritePriceTransactionData(
    feedId: string,
    payload: Promise<string>
  ) {
    const fun = `${this.priceAdapterPackageAddress.toString()}::price_adapter::write_price`;
    return {
      identifier: `Write ${feedId} price: ${fun}`,
      function: fun as MoveFunctionId,
      functionArguments: [
        this.priceAdapterObjectAddress.toString(),
        makeFeedId(feedId),
        makePayload(await payload),
      ],
    };
  }
}

function makeFeedId(feedId: string) {
  const asBytes = makeFeedIdBytes(feedId);

  return MoveVector.U8(asBytes);
}

function makePayload(payload: string) {
  return MoveVector.U8(payload);
}
