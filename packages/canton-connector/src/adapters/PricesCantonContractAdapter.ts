import { WriteContractAdapter } from "@redstone-finance/multichain-kit";
import { ContractParamsProvider } from "@redstone-finance/sdk";
import { FP } from "@redstone-finance/utils";
import { CantonClient } from "../client/CantonClient";
import { CantonChoiceExerciser, CantonContractUpdater } from "../tx/CantonContractUpdater";
import { CantonTrafficMeter } from "../tx/CantonTrafficMeter";
import { CantonTxDeliveryMan } from "../tx/CantonTxDeliveryMan";
import { ConstCantonTrafficMeter } from "../tx/ConstCantonTrafficMeter";
import { RealCantonTrafficMeter } from "../tx/RealCantonTrafficMeter";
import { ActiveContractData } from "../utils/utils";
import { CantonContractAdapterConfig } from "./CantonContractAdapterConfig";
import { DEFS_KEY_FEATURED_APP_RIGHT } from "./CoreClientCantonContractAdapter";
import { IADAPTER_TEMPLATE_NAME, PricesCantonReadOnlyAdapter } from "./PricesCantonReadOnlyAdapter";

export const WRITE_PRICES_CHOICE = "WritePrices";

export class PricesCantonContractAdapter
  extends PricesCantonReadOnlyAdapter
  implements WriteContractAdapter, CantonChoiceExerciser
{
  private readonly txDeliveryMan: CantonTxDeliveryMan;
  private readonly contractUpdater: CantonContractUpdater;
  private readonly trafficMeter: CantonTrafficMeter;
  private readonly additionalPillViewers?: string[];

  constructor(
    client: CantonClient,
    config: CantonContractAdapterConfig,
    interfaceId = client.getDefs().interfaceId,
    templateName = IADAPTER_TEMPLATE_NAME
  ) {
    super(client, config, interfaceId, templateName);

    this.additionalPillViewers = config.additionalPillViewers;
    this.trafficMeter = config.useConstTrafficMeter
      ? new ConstCantonTrafficMeter(config.shouldAccumulateTraffic, config.totalFeedCount)
      : new RealCantonTrafficMeter(
          config.shouldAccumulateTraffic,
          this.client.getTotalConsumedTraffic.bind(this.client)
        );
    this.txDeliveryMan = new CantonTxDeliveryMan(config, this.trafficMeter);
    this.contractUpdater = new CantonContractUpdater(this, config.updaterPartyId);
  }

  getSignerAddress() {
    return Promise.resolve(this.contractUpdater.getSignerAddress());
  }

  async exerciseWritePricesChoice(actAs: string, argument: object) {
    const paidTrafficCost = this.trafficMeter.consumeAccumulated();

    const context = {
      context: {
        additionalPillViewers: this.additionalPillViewers ?? [],
        paidTrafficCost: paidTrafficCost.toString(),
      },
    };

    const { result, metadata } = await this.exerciseChoice<ActiveContractData | string>(
      this.config.viewerPartyId,
      actAs,
      WRITE_PRICES_CHOICE,
      {
        ...argument,
        ...context,
      },
      {
        withCurrentTime: true,
        disclosedContractData: [this.client.getDefs()[DEFS_KEY_FEATURED_APP_RIGHT]],
        withCaller: true,
        withRetry: false,
      }
    );

    if (typeof result === "string" && paidTrafficCost) {
      // no update was performed — return the consumed cost back to the meter
      this.trafficMeter.refund(paidTrafficCost);
    }

    return { result, metadata };
  }

  async writePricesFromPayloadToContract(paramsProvider: ContractParamsProvider): Promise<string> {
    try {
      const result = await this.txDeliveryMan.updateContract(this.contractUpdater, paramsProvider);
      const contractId = FP.unwrapSuccess(result).transactionHash;

      this.activeContractData = {
        contractId,
        synchronizerId: this.activeContractData?.synchronizerId,
      };

      return contractId;
    } catch (e) {
      this.activeContractData = undefined;

      throw e;
    }
  }

  onError() {
    this.activeContractData = undefined;
  }
}
