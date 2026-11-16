import { RedstoneCommon } from "@redstone-finance/utils";
import { CantonClient } from "../client/CantonClient";
import { CantonContractAdapter } from "./CantonContractAdapter";
import { CapsAdapterPlugin } from "./CapsAdapterPlugin";

export abstract class CapsPluginCantonContractAdapter<Argument>
  extends CantonContractAdapter
  implements CapsAdapterPlugin
{
  private lastRunMs = 0;
  private isRunning = false;

  protected constructor(
    client: CantonClient,
    packageId: string,
    templateName: string,
    protected readonly operatorPartyId: string,
    private readonly intervalMs: number
  ) {
    super(client, packageId, templateName);
  }

  async run() {
    if (this.isRunning || Date.now() - this.lastRunMs < this.intervalMs) {
      return undefined;
    }

    this.isRunning = true;
    try {
      const paidTrafficCost = await this.execute();
      this.lastRunMs = Date.now();

      return paidTrafficCost;
    } catch (error) {
      this.logger.error(`${this.templateName} failed: ${RedstoneCommon.stringifyError(error)}`);

      return undefined;
    } finally {
      this.isRunning = false;
    }
  }

  protected async fetchPluginContract() {
    return await this.client.getActiveTemplateContractData<Argument>(
      this.operatorPartyId,
      this.getInterfaceId(),
      this.getCombinedSignatoryContractFilter(this.operatorPartyId)
    );
  }

  protected abstract execute(): Promise<number | undefined>;
}
