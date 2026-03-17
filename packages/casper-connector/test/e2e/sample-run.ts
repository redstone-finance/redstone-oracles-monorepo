import { ForwardCompatibleWriteContractAdapter, sampleRun } from "@redstone-finance/multichain-kit";
import { CasperConfig, makeCasperConnection, PriceAdapterCasperContractConnector } from "../../src";
import { PriceFeedCasperContractConnector } from "../../src/contracts/price_feed/PriceFeedCasperContractConnector";
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
    await new PriceFeedCasperContractConnector(connection, FEED_ADDRESS).getAdapter(),
    async () => {
      await connection.refreshStateRootHash();
    }
  );
}

void main(config);
