import { PriceFeedAdapter } from "@redstone-finance/multichain-kit";
import { BigNumber } from "ethers";
import { ICasperConnection } from "../../casper/ICasperConnection";
import { CasperContractAdapter } from "../CasperContractAdapter";
import {
  ENTRY_POINT_GET_PRICE_AND_TIMESTAMP,
  STORAGE_KEY_TIMESTAMP,
  STORAGE_KEY_VALUE,
} from "../constants";
import { VersionedCasperContract } from "../VersionedCasperContract";

export class PriceFeedCasperContractAdapter
  extends CasperContractAdapter
  implements PriceFeedAdapter
{
  constructor(connection: ICasperConnection, contractPackageHash: string) {
    super(connection, new VersionedCasperContract(connection, contractPackageHash));
  }

  private static GET_PRICE_AND_TIMESTAMP_CSPR = 1;

  async getPriceAndTimestamp() {
    const deployId = await this.callEntrypoint(
      ENTRY_POINT_GET_PRICE_AND_TIMESTAMP,
      PriceFeedCasperContractAdapter.GET_PRICE_AND_TIMESTAMP_CSPR
    );
    await this.assertWaitForDeployAndRefreshStateRootHash(deployId);

    return {
      value: await this.readValueFromContract(),
      timestamp: await this.readTimestampFromContract(),
    };
  }

  async readTimestampFromContract(): Promise<number> {
    const timestamp: BigNumber = await this.queryContractData(STORAGE_KEY_TIMESTAMP);

    return timestamp.toNumber();
  }

  async readValueFromContract() {
    const value: BigNumber = await this.queryContractData(STORAGE_KEY_VALUE);

    return value.toBigInt();
  }

  getDecimals() {
    return Promise.resolve(undefined);
  }

  getDescription() {
    return Promise.resolve(undefined);
  }

  getDataFeedId() {
    return Promise.resolve(undefined);
  }
}
