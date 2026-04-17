import { ForwardCompatibleWriteContractAdapter, sampleRun } from "@redstone-finance/multichain-kit";
import { CasperConfig, makeCasperConnection, PriceAdapterCasperContractConnector } from "../../src";
import { PriceFeedCasperContractAdapter } from "../../src/contracts/price_feed/PriceFeedCasperContractAdapter";
import { config } from "./config";
import { FEED_ADDRESS, makeContractParamsProvider, RELAY_ADAPTER_ADDRESS } from "./e2e-utils";

async function main(config: CasperConfig) {
  const connection = await makeCasperConnection(config);
  const pricesConnector = new PriceAdapterCasperContractConnector(
    connection,
    RELAY_ADAPTER_ADDRESS
  );
  const paramsProvider = makeContractParamsProvider();
  const adapter = await ForwardCompatibleWriteContractAdapter.fromConnector(pricesConnector);

  await sampleRun(
    paramsProvider,
    adapter,
    pricesConnector,
    new PriceFeedCasperContractAdapter(connection, FEED_ADDRESS),
    async () => {
      await connection.refreshStateRootHash();
    }
  );
}

void main(config);
