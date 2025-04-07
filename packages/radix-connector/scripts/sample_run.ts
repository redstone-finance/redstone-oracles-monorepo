import {
  ContractParamsProvider,
  convertValue,
  describeContractData,
  describeTimestamp,
  getSignersForDataServiceId,
  sampleRun,
} from "@redstone-finance/sdk";
import {
  PriceAdapterRadixContractConnector,
  PriceFeedRadixContractConnector,
} from "../src";
import {
  DATA_SERVICE_ID,
  FEED_ID,
  loadAddress,
  makeRadixClient,
  PRICE_ADAPTER_NAME,
  PROXY_NAME,
} from "./constants";

async function main() {
  const paramsProvider = new ContractParamsProvider({
    dataPackagesIds: ["XRD"],
    dataServiceId: DATA_SERVICE_ID,
    uniqueSignersCount: 3,
    authorizedSigners: getSignersForDataServiceId(DATA_SERVICE_ID),
  });

  const client = makeRadixClient();

  const connector = new PriceAdapterRadixContractConnector(
    client,
    await loadAddress(`component`, PRICE_ADAPTER_NAME)
  );
  const priceAdapter = await connector.getAdapter();

  const priceFeed = new PriceFeedRadixContractConnector(
    client,
    await loadAddress(`component`, PROXY_NAME, FEED_ID)
  );

  await sampleRun(paramsProvider, connector, priceFeed);

  priceAdapter.readMode = "CallReadMethod";
  const timestampRead = await priceAdapter.readTimestampFromContract(
    paramsProvider.getDataFeedIds()[0]
  );
  console.log(
    `Timestamp read by using method read_timestamp: ${timestampRead} (${describeTimestamp(timestampRead)})`
  );
  console.log(
    `Values read by using method read_prices: \n${(
      await priceAdapter.readPricesFromContract(paramsProvider)
    )
      .map(convertValue)
      .toString()}`
  );
  console.log(
    `Values read by using method read_price_data ${describeContractData(
      await priceAdapter.readContractData(paramsProvider.getDataFeedIds())
    )}`
  );
}

void main();
