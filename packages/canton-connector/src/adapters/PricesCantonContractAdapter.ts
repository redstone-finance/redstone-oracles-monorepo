import { TxDeliveryMan, WriteContractAdapter } from "@redstone-finance/multichain-kit";
import { ContractParamsProvider } from "@redstone-finance/sdk";
import { FP } from "@redstone-finance/utils";
import { CantonClient } from "../CantonClient";
import { CantonChoiceExerciser, CantonContractUpdater } from "../CantonContractUpdater";
import { CantonContractAdapterConfig } from "./CantonContractAdapterConfig";
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

  exerciseWriteChoice<Res, Arg extends object>(actAs: string, argument: Arg): Promise<Res> {
    return this.exerciseChoice(
      this.config.viewerPartyId,
      actAs,
      WRITE_PRICES_CHOICE,
      {
        ...argument,
        additionalPillViewers: this.additionalPillViewers,
      },
      {
        withCurrentTime: true,
        disclosedContractData: [this.client.Defs[DEFS_KEY_FEATURED_APP_RIGHT]],
        withCaller: true,
        withRetry: false,
      }
    );
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

  getRemainingTraffic(): Promise<number> {
    return this.client.getRemainingTraffic();
  }
}
