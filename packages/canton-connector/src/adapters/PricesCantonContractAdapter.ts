import { TxDeliveryMan, WriteContractAdapter } from "@redstone-finance/multichain-kit";
import { ContractParamsProvider } from "@redstone-finance/sdk";
import { FP, RedstoneCommon } from "@redstone-finance/utils";
import { CantonClient } from "../CantonClient";
import { ActiveContractData } from "../utils";
import { CantonContractAdapterConfig } from "./CantonContractAdapterConfig";
import { CantonChoiceExerciser, CantonContractUpdater } from "./CantonContractUpdater";
import { DEFS_KEY_FEATURED_APP_RIGHT } from "./CoreClientCantonContractAdapter";
import { IADAPTER_TEMPLATE_NAME, PricesCantonReadOnlyAdapter } from "./PricesCantonReadOnlyAdapter";

export const WRITE_PRICES_CHOICE = "WritePrices";

export class PricesCantonContractAdapter
  extends PricesCantonReadOnlyAdapter
  implements WriteContractAdapter, CantonChoiceExerciser
{
  private readonly txDeliveryMan: TxDeliveryMan;
  private readonly contractUpdater: CantonContractUpdater;
  private readonly additionalPillViewers?: string[];
  private accumulatedPaidTrafficCost?: number;

  constructor(
    client: CantonClient,
    config: CantonContractAdapterConfig,
    interfaceId = client.Defs.interfaceId,
    templateName = IADAPTER_TEMPLATE_NAME
  ) {
    super(client, config, interfaceId, templateName);

    this.additionalPillViewers = config.additionalPillViewers;
    this.txDeliveryMan = new TxDeliveryMan(config);
    this.contractUpdater = new CantonContractUpdater(this, config.updaterPartyId);
  }

  getSignerAddress() {
    return Promise.resolve(this.contractUpdater.getSignerAddress());
  }

  async exerciseWritePricesChoice(actAs: string, argument: object) {
    const paidTrafficCost = this.accumulatedPaidTrafficCost;
    this.accumulatedPaidTrafficCost = 0;

    if (paidTrafficCost) {
      this.logger.info(`Consuming accumulatedPaidTrafficCost: ${paidTrafficCost}`, {
        paidTrafficCost,
      });
    }

    const { result, metadata } = await this.exerciseChoice<ActiveContractData | string>(
      this.config.viewerPartyId,
      actAs,
      WRITE_PRICES_CHOICE,
      {
        ...argument,
        context: { additionalPillViewers: this.additionalPillViewers, paidTrafficCost },
      },
      {
        withCurrentTime: true,
        disclosedContractData: [this.client.Defs[DEFS_KEY_FEATURED_APP_RIGHT]],
        withCaller: true,
        withRetry: false,
      }
    );

    if (typeof result === "string") {
      // returning paidTrafficCost when no update was performed
      this.addPaidTrafficCost(paidTrafficCost);
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

  addPaidTrafficCost(paidTrafficCost?: number) {
    if (!RedstoneCommon.isDefined(paidTrafficCost) || paidTrafficCost < 0) {
      return;
    }
    this.logger.info(`Used paidTrafficCost: ${paidTrafficCost}`, { paidTrafficCost });

    this.accumulatedPaidTrafficCost ??= 0;
    this.accumulatedPaidTrafficCost += paidTrafficCost;
  }

  onError() {
    this.activeContractData = undefined;
  }

  getRemainingTraffic(): Promise<number> {
    return this.client.getRemainingTraffic();
  }
}
