import { Account } from "@aptos-labs/ts-sdk";
import { WriteContractAdapter } from "@redstone-finance/multichain-kit";
import { ContractParamsProvider } from "@redstone-finance/sdk";
import { MoveClient } from "../MoveClient";
import { MoveTxDeliveryMan } from "../MoveTxDeliveryMan";
import { TransactionConfig } from "../types";
import { MovePriceAdapterContractViewer } from "./MovePriceAdapterContractViewer";
import { MovePriceAdapterContractWriter } from "./MovePriceAdapterContractWriter";

export class MovePricesContractAdapter implements WriteContractAdapter {
  constructor(
    private readonly viewer: MovePriceAdapterContractViewer,
    private readonly writer?: MovePriceAdapterContractWriter
  ) {}

  static create(
    client: MoveClient,
    args: { packageObjectAddress: string; priceAdapterObjectAddress: string },
    account?: Account,
    txConfig?: TransactionConfig
  ) {
    const { packageObjectAddress, priceAdapterObjectAddress } = args;
    const viewer = new MovePriceAdapterContractViewer(
      client,
      packageObjectAddress,
      priceAdapterObjectAddress
    );
    const writer = account
      ? new MovePriceAdapterContractWriter(
          new MoveTxDeliveryMan(client, account, txConfig),
          packageObjectAddress,
          priceAdapterObjectAddress
        )
      : undefined;

    return new MovePricesContractAdapter(viewer, writer);
  }

  getSignerAddress() {
    if (!this.writer) {
      throw new Error("Adapter not set up for writes");
    }

    return Promise.resolve(this.writer.getSignerAddress().toString());
  }

  async writePricesFromPayloadToContract(paramsProvider: ContractParamsProvider) {
    if (!this.writer) {
      throw new Error("Adapter not set up for writes");
    }

    const unsignedMetadataArgs = {
      withUnsignedMetadata: true,
      metadataTimestamp: Date.now(),
    };

    const payload = paramsProvider.getPayloadHex(true, unsignedMetadataArgs);

    return await this.writer.writeAllPrices(paramsProvider.getDataFeedIds(), payload, () =>
      paramsProvider.getPayloadHex(true, unsignedMetadataArgs)
    );
  }

  async getUniqueSignerThreshold() {
    return await this.viewer.viewUniqueSignerThreshold();
  }

  async readContractData(feedIds: string[]) {
    return await this.viewer.viewContractData(feedIds);
  }
}
