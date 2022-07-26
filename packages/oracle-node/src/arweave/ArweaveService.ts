import axios, { AxiosResponse } from "axios";
import { Consola } from "consola";
import ArweaveProxy from "./ArweaveProxy";
import contracts from "../../src/config/contracts.json";
import { promiseTimeout } from "../utils/promise-timeout";
import { Manifest, RedstoneOraclesState } from "../types";

const logger = require("../utils/logger")("ArweaveService") as Consola;

// DEN = distributed execution network
const SMARTWEAVE_DEN_NODE_URL = "https://d2rkt3biev1br2.cloudfront.net/state";
const ARWEAVE_URL = "https://arweave.net";
const ORACLE_REGISTRY_CONTRACT_ID = contracts["oracle-registry"];
const TIMEOUT_MS = 10 * 1000;

type StateFetcherMethodName =
  | "getOracleRegistryStateByDen"
  | "getOracleRegistryStateByGateway";

// Business service that supplies operations required by Redstone-Node.
export default class ArweaveService {
  constructor(
    private readonly arweaveProxy: ArweaveProxy,
    private readonly timeout: number = TIMEOUT_MS
  ) {}

  private stateFetchersFunctionsPriority: StateFetcherMethodName[] = [
    "getOracleRegistryStateByDen",
    "getOracleRegistryStateByGateway",
  ];

  private async getOracleRegistryStateByDen(): Promise<RedstoneOraclesState> {
    const response = await axios.get(SMARTWEAVE_DEN_NODE_URL, {
      params: { id: ORACLE_REGISTRY_CONTRACT_ID },
    });
    return response.data.state;
  }

  private async getOracleRegistryStateByGateway(): Promise<RedstoneOraclesState> {
    const oracleRegistryContract =
      this.arweaveProxy.smartweave.contract<RedstoneOraclesState>(
        ORACLE_REGISTRY_CONTRACT_ID
      );
    return (await oracleRegistryContract.readState()).state;
  }

  private async getOracleRegistryState(
    fallbackIndex: number = 0
  ): Promise<RedstoneOraclesState> {
    const functionName = this.stateFetchersFunctionsPriority[fallbackIndex];
    const oracleRegistryStateFetcher = this[functionName];
    try {
      return await promiseTimeout(
        oracleRegistryStateFetcher.bind(this),
        this.timeout
      );
    } catch (error: any) {
      logger.error(error.stack);
      const lastFallbackIndex = this.stateFetchersFunctionsPriority.length - 1;
      if (fallbackIndex >= lastFallbackIndex) {
        throw new Error("Cannot fetch oracle registry state");
      } else {
        logger.warn(`Get oracle registry failed on step ${functionName}`);
        return await this.getOracleRegistryState(fallbackIndex + 1);
      }
    }
  }

  private async fetchManifestPromise(manifestTxId: string) {
    const response = await axios.get(`${ARWEAVE_URL}/${manifestTxId}`);
    const parsedManifest = (response as AxiosResponse<Manifest>).data;
    parsedManifest.txId = manifestTxId;
    return parsedManifest;
  }

  async getCurrentManifest(oldManifest?: Manifest): Promise<Manifest> {
    try {
      const oracleRegistry = await this.getOracleRegistryState();
      const jwkAddress = await this.arweaveProxy.getAddress();
      const currentDataFeedId = oracleRegistry.nodes[jwkAddress].dataFeedId;
      const currentDataFeed = oracleRegistry.dataFeeds[currentDataFeedId];
      const manifestTxId = currentDataFeed.manifestTxId;
      return await promiseTimeout(
        () => this.fetchManifestPromise(manifestTxId),
        this.timeout
      );
    } catch (error: any) {
      if (oldManifest) {
        return oldManifest;
      } else {
        logger.error(error.stack);
        throw new Error(
          "Cannot fetch new manifest and old manifest doesn't exist"
        );
      }
    }
  }
}
