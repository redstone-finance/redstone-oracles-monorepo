import { TonPriceFeed } from "../../wrappers/TonPriceFeed";
import { AnyTonOpenedContract } from "../network/TonNetwork";

export class TonPriceFeedContractAdapter {
  constructor(public readonly contract: AnyTonOpenedContract<TonPriceFeed>) {}

  async sendDeploy() {
    await this.contract.sendDeploy();
  }

  async getData() {
    return await this.contract.getData();
  }

  async fetchData() {
    await this.contract.sendFetchData();
  }
}
