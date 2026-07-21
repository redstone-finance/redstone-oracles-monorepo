import { getPriceFeedAdapterCreator } from "@redstone-finance/chain-orchestrator";
import { consts } from "@redstone-finance/protocol";
import { utils } from "ethers";
import { config, ConsciouslyInvoked } from "../../src/config/config";

const PRICE_FEED_ADDRESS = "";

void (async () => {
  const relayerConfig = config(ConsciouslyInvoked);
  const createPriceFeedAdapter = await getPriceFeedAdapterCreator(relayerConfig.networkId, "prod");
  const priceFeedAdapter = await createPriceFeedAdapter(PRICE_FEED_ADDRESS);
  const { value } = await priceFeedAdapter.getPriceAndTimestamp();
  const price = utils.formatUnits(value, consts.DEFAULT_NUM_VALUE_DECIMALS);
  console.log(price);
})();
