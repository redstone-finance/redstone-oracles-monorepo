import { sampleRun } from "@redstone-finance/multichain-kit";
import { ContractParamsProvider, getSignersForDataServiceId } from "@redstone-finance/sdk";
import { RedstoneCommon, RpcTelemetry } from "@redstone-finance/utils";
import "dotenv/config";
import {
  makeSuiKeypair,
  readSuiConfig,
  SuiBlockchainService,
  SuiClientBuilder,
  SuiNetworkSchema,
  SuiWriteContractAdapter,
} from "../src";
import { getRpcUrls } from "./get-rpc-urls";

const SMALL_FEED_SET = ["BTC", "ETH", "LBTC_FUNDAMENTAL"];

const BIG_FEED_SET = [
  "LBTC_FUNDAMENTAL",
  "pzETH_FUNDAMENTAL",
  "USD3",
  "eBTC/WBTC",
  "pumpBTC/BTC",
  "pumpBTC_FUNDAMENTAL",
  "fxUSD",
  "PUFFER",
  "ETHx/ETH",
  "eUSD",
  "osETH/ETH",
  "sfrxETH/ETH",
  "sUSDe",
  "USDe",
  "beraSTONE_FUNDAMENTAL",
  "SWELL/ETH",
  "ETHx",
  "XVS",
  "ETH",
  "BTC",
  "BUIDL_FUNDAMENTAL",
  "egETH_FUNDAMENTAL",
  "bfBTC_FUNDAMENTAL",
  "HLScope_FUNDAMENTAL",
  "ACRED_FUNDAMENTAL",
  "USUAL",
  "PROMPT",
  "EIGEN",
  "tacETH_FUNDAMENTAL",
  "tacUSD_FUNDAMENTAL",
  "tacBTC_FUNDAMENTAL",
  "swETH_FUNDAMENTAL",
  "BUIDL_DAILY_INTEREST_ACCRUAL",
  "BUIDL_I_ETHEREUM_FUNDAMENTAL",
  "BUIDL_I_ETHEREUM_DAILY_ACCRUAL",
  "VBILL_ETHEREUM_FUNDAMENTAL",
  "SPK",
  "hwHLP_FUNDAMENTAL",
  "USDC_V2",
  "USDT_V2",
  "PYUSD",
  "cUSD_FUNDAMENTAL",
  "thBILL_FUNDAMENTAL",
  "VBILL_ETHEREUM_DAILY_ACCRUAL",
  "WLFI",
  "wstETH",
  "wstETH/stETH",
  "YUSD_FUNDAMENTAL",
  "rswETH_FUNDAMENTAL",
  "sYUSD_FUNDAMENTAL",
  "STAC_FUNDAMENTAL",
  "iBENJI_ETHEREUM_FUNDAMENTAL",
  "SIERRA_FUNDAMENTAL",
  "APR",
  "PT_srUSDe_15JAN2026_ETH-TWAP",
  "MSUSD_FUNDAMENTAL",
  "MSY_FUNDAMENTAL/USD",
  "syzUSD_FUNDAMENTAL/USD",
  "STRC",
  "DLF_FUNDAMENTAL",
  "DLF_PUBLICATION_TS",
  "NUSD_FUNDAMENTAL",
  "weETH/ETH",
  "muBOND_FUNDAMENTAL",
  "AZND_FUNDAMENTAL",
  "SolvBTC_FUNDAMENTAL",
  "USST_FUNDAMENTAL",
  "cbBTC",
  "sthUSD_FUNDAMENTAL",
  "AI",
  "mzUSD_FUNDAMENTAL",
  "mzUSD_TOTAL_SUPPLY",
  "AMCASH+_FUNDAMENTAL",
  "WBTC/BTC",
  "VUSD_FUNDAMENTAL",
  "sVUSD_FUNDAMENTAL",
  "NGI+_FUNDAMENTAL",
  "ETHFI",
  "AVLT_FUNDAMENTAL/USD",
  "XRP",
];

async function main() {
  const network = RedstoneCommon.getFromEnv("NETWORK", SuiNetworkSchema);
  const useSmallFeedSet = true as boolean;
  const rpcUrls = await getRpcUrls(network);

  const paramsProvider = new ContractParamsProvider({
    dataServiceId: "redstone-primary-prod",
    uniqueSignersCount: 3,
    dataPackagesIds: useSmallFeedSet ? SMALL_FEED_SET : BIG_FEED_SET,
    authorizedSigners: getSignersForDataServiceId("redstone-primary-prod"),
    ignoreMissingFeed: true,
  });

  const suiClient = new SuiClientBuilder()
    .withSuiNetwork(network)
    .withRpcUrls(rpcUrls)
    .withTelemetry(RpcTelemetry.logRpcMetric)
    .build();

  const adapter = new SuiWriteContractAdapter(suiClient, makeSuiKeypair(), readSuiConfig(network));

  await sampleRun(paramsProvider, adapter, new SuiBlockchainService(suiClient));
}

void main();
