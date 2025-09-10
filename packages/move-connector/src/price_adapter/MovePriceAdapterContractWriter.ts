import { MoveFunctionId, MoveVector } from "@aptos-labs/ts-sdk";
import { SplitPayloads } from "@redstone-finance/sdk";
import { MoveTransactionData, MoveTxDeliveryMan } from "../MoveTxDeliveryMan";
import { makeFeedIdBytes } from "../utils";

export class MovePriceAdapterContractWriter {
  constructor(
    private readonly txDeliveryMan: MoveTxDeliveryMan,
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
      const data: MoveTransactionData = await this.makeWritePriceTransactionData(
        feedId,
        Promise.resolve(payload)
      );

      if (deferredDataRequest) {
        data.deferredDataProvider = () =>
          this.makeWritePriceTransactionData(feedId, deferredDataRequest(feedId));
      }

      return data;
    });

    return await this.txDeliveryMan.sendBatchTransactions(data);
  }

  async writeAllPrices(
    feedIds: string[],
    payload: Promise<string>,
    deferredDataRequest?: () => Promise<string>
  ) {
    const data: MoveTransactionData = await this.makeWritePricesTransactionData(feedIds, payload);

    if (deferredDataRequest) {
      data.deferredDataProvider = () =>
        this.makeWritePricesTransactionData(feedIds, deferredDataRequest());
    }

    return await this.txDeliveryMan.sendBatchTransactions([Promise.resolve(data)]);
  }

  private async makeWritePriceTransactionData(feedId: string, payload: Promise<string>) {
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

  private async makeWritePricesTransactionData(feedIds: string[], payload: Promise<string>) {
    const fun = `${this.priceAdapterPackageAddress.toString()}::price_adapter::write_prices`;
    return {
      identifier: `Write [${[...feedIds].sort().toString()}] price: ${fun}`,
      function: fun as MoveFunctionId,
      functionArguments: [
        this.priceAdapterObjectAddress.toString(),
        makeFeedIds(feedIds),
        makePayload(await payload),
      ],
    };
  }
}

function makeFeedId(feedId: string) {
  const asBytes = makeFeedIdBytes(feedId);

  return MoveVector.U8(asBytes);
}

function makeFeedIds(feedIds: string[]) {
  return feedIds.map(makeFeedId);
}

function makePayload(payload: string) {
  return MoveVector.U8(payload);
}
