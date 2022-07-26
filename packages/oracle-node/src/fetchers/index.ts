import { Fetcher } from "../types";
import ccxtFetchers from "./ccxt/all-ccxt-fetchers";
import pangolinFetchers from "./pangolin/all-pangolin-fetchers";
import { YfUnofficialFetcher } from "./yf-unofficial/YfUnofficialFetcher";
import { CustomUrlsFetcher } from "./custom-urls/CustomUrlsFetcher";
import { TraderJoeFetcher } from "./trader-joe/TraderJoeFetcher";
import { CoingeckoFetcher } from "./coingecko/CoingeckoFetcher";
import { SushiswapFetcher } from "./sushiswap/SushiswapFetcher";
import { UniswapFetcher } from "./uniswap/UniswapFetcher";
import { KyberFetcher } from "./kyber/KyberFetcher";
import { VertoFetcher } from "./verto/VertoFetcher";
import { EcbFetcher } from "./ecb/EcbFetcher";
import { DrandFetcher } from "./drand/DrandFetcher";
import twapFetchers from "./twap/all-twap-fetchers";
import { TwelveDataFetcher } from "./twelve-data/TwelveDataFetcher";

export default {
  "yf-unofficial": new YfUnofficialFetcher(),
  "custom-urls": new CustomUrlsFetcher(),
  "trader-joe": new TraderJoeFetcher(),
  "twelve-data": new TwelveDataFetcher(),
  coingecko: new CoingeckoFetcher(),
  sushiswap: new SushiswapFetcher(),
  uniswap: new UniswapFetcher(),
  drand: new DrandFetcher(),
  kyber: new KyberFetcher(),
  verto: new VertoFetcher(),
  ecb: new EcbFetcher(),

  ...ccxtFetchers,
  ...pangolinFetchers,
  ...twapFetchers,
} as { [name: string]: Fetcher };
