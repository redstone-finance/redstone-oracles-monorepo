import { getSignersForDataServiceId } from "@redstone-finance/oracles-smartweave-contracts";
import {
  ContractParamsProvider,
  IContractConnector,
  IPriceManagerContractAdapter,
  IPriceRoundsFeedContractAdapter,
} from "@redstone-finance/sdk";
import {
  PriceRoundsAdapterStarknetContractConnector,
  PriceRoundsFeedStarknetContractConnector,
  StarknetContractConnector,
  getAccount,
} from "@redstone-finance/starknet-connector";
import { config } from "../config";
import {
  DATA_FEEDS,
  DATA_SERVICE_ID,
  UNIQUE_SIGNER_COUNT,
} from "../config/data-service-parameters";

export class ContractConnectorFactory {
  static makePriceManagerContractConnector(): IContractConnector<IPriceManagerContractAdapter> &
    StarknetContractConnector<IPriceManagerContractAdapter> {
    return new PriceRoundsAdapterStarknetContractConnector(
      getAccount(config),
      config.priceAdapterAddress,
      new ContractParamsProvider({
        dataServiceId: DATA_SERVICE_ID,
        uniqueSignersCount: UNIQUE_SIGNER_COUNT,
        dataPackagesIds: DATA_FEEDS,
        authorizedSigners: getSignersForDataServiceId(DATA_SERVICE_ID),
      }),
      config.maxEthFee
    );
  }

  static makePriceFeedContractConnector(
    feedAddress: string
  ): IContractConnector<IPriceRoundsFeedContractAdapter> {
    return new PriceRoundsFeedStarknetContractConnector(
      getAccount(config),
      feedAddress
    );
  }
}
