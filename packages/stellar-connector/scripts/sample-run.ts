import { sampleRun } from "@redstone-finance/multichain-kit";
import { ContractParamsProvider, getSignersForDataServiceId } from "@redstone-finance/sdk";
import { RpcTelemetry } from "@redstone-finance/utils";
import {
  makeKeypair,
  PriceFeedStellarContractAdapter,
  StellarBlockchainService,
  StellarClientBuilder,
  StellarWriteContractAdapter,
} from "../src";
import { FEEDS } from "./consts";
import { getRpcUrls } from "./get-rpc-urls";
import { loadAdapterId, loadPriceFeedId, readNetwork } from "./utils";

async function main() {
  const keypair = makeKeypair();
  const adapterId = loadAdapterId();
  const network = readNetwork();

  const client = new StellarClientBuilder()
    .withStellarNetwork(network)
    .withRpcUrls(await getRpcUrls(network))
    .withMulticall()
    .withTelemetry(RpcTelemetry.logRpcMetric)
    .build();
  const adapter = new StellarWriteContractAdapter(client, adapterId, keypair);

  const paramsProvider = new ContractParamsProvider({
    dataPackagesIds: FEEDS,
    dataServiceId: "redstone-primary-prod",
    uniqueSignersCount: 3,
    authorizedSigners: getSignersForDataServiceId("redstone-primary-prod"),
  });

  const ethPriceFeedConnector = new PriceFeedStellarContractAdapter(client, loadPriceFeedId());
  const service = new StellarBlockchainService(client);

  await sampleRun(paramsProvider, adapter, service, ethPriceFeedConnector);
}

void main().catch((err) => console.log(err));
