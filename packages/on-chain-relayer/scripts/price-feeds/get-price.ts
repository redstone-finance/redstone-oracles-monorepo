import { IPriceFeedAbi, PriceFeedBase } from "@redstone-finance/evm-adapters";
import { Contract, utils } from "ethers";
import { config, ConsciouslyInvoked } from "../../src/config/config";
import { getRelayerProvider } from "../../src/core/contract-interactions/get-relayer-provider";

// Usage: yarn run-script src/scripts/price-feeds/get-price.ts
// Note! You should configure the .env file properly before running this script

const PRICE_FEED_ADDRESS = "";

void (async () => {
  const relayerConfig = config(ConsciouslyInvoked);
  const provider = getRelayerProvider(relayerConfig);
  const priceFeedContract = new Contract(
    PRICE_FEED_ADDRESS,
    IPriceFeedAbi,
    provider
  ) as PriceFeedBase;
  const latestRoundData = await priceFeedContract.latestRoundData();
  const price = utils.formatUnits(latestRoundData.answer, 8);
  console.log(price);
})();
