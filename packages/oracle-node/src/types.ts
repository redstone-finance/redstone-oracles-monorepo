import { JWKInterface } from "arweave/node/lib/wallet";
import { SignedDataPackagePlainObj } from "redstone-protocol";

export interface Manifest {
  txId?: string; // Note, you need to set this field manually (after downloading the manifest data)
  interval: number;
  priceAggregator: string;
  defaultSource?: string[];
  sourceTimeout: number;
  maxPriceDeviationPercent: number;
  evmChainId: number;
  tokens: { [symbol: string]: TokenConfig };
  httpBroadcasterURLs?: string[];
  enableStreamrBroadcaster?: boolean;
  disableSinglePricesBroadcastingInStreamr?: boolean;
  enableArweaveBackup?: boolean;
}

export interface SourceTimeout {
  default: number;
  source: { [symbol: string]: number };
}

export interface Credentials {
  twelveDataRapidApiKey?: string;
}

export interface TokenConfig {
  source?: string[];
  maxPriceDeviationPercent?: number;
  customUrlDetails?: CustomUrlDetails;
  comment?: string;
}

export interface CustomUrlDetails {
  url: string;
  jsonpath: string;
}

export interface FetcherOpts {
  credentials: Credentials;
  manifest: Manifest;
}

export interface Fetcher {
  fetchAll: (
    tokens: string[],
    opts?: FetcherOpts
  ) => Promise<PriceDataFetched[]>;
}

export interface Aggregator {
  getAggregatedValue: (
    price: PriceDataBeforeAggregation,
    maxPriceDeviationPercent: number
  ) => PriceDataAfterAggregation;
}

export interface PricesObj {
  [symbol: string]: number;
}

export interface PriceDataFetched {
  symbol: string;
  value: any; // usually it is a positive number, but it may also be 0, null, undefined or "error"
}

export interface PriceDataBeforeAggregation {
  id: string;
  symbol: string;
  source: { [sourceName: string]: any };
  timestamp: number;
  version: string;
}

export interface PriceDataAfterAggregation extends PriceDataBeforeAggregation {
  value: number;
}

export interface PriceDataBeforeSigning extends PriceDataAfterAggregation {
  permawebTx: string;
  provider: string;
}

export interface PriceDataSigned extends PriceDataBeforeSigning {
  signature?: string;
}

export interface ShortSinglePrice {
  symbol: string;
  value: any;
}

export interface PricePackage {
  prices: ShortSinglePrice[];
  timestamp: number;
}
export interface SerializedPriceData {
  symbols: string[];
  values: any[];
  timestamp: number;
}

export interface ArweaveTransactionTags {
  [tag: string]: string;
}

export interface PrivateKeys {
  arweaveJwk: JWKInterface;
  ethereumPrivateKey: string;
}

export interface NodeConfig {
  enableJsonLogs: boolean;
  enablePerformanceTracking: boolean;
  printDiagnosticInfo: boolean;
  manifestRefreshInterval: number;
  credentials: Credentials;
  privateKeys: PrivateKeys;
  overrideManifestUsingFile?: Manifest;
}

interface EvolveState {
  canEvolve: boolean;
  evolve: string | null;
}

export interface RedstoneOraclesState extends EvolveState {
  contractAdmins: string[];
  nodes: Nodes;
  dataFeeds: DataFeeds;
}

type Nodes = { [key in string]: Node };
type DataFeeds = { [key in string]: DataFeed };

interface Node {
  name: string;
  logo: string;
  description: string;
  dataFeedId: string;
  evmAddress: string;
  ipAddress: string;
  ecdsaPublicKey: string;
  arweavePublicKey: string;
  url?: string;
}

interface DataFeed {
  name: string;
  manifestTxId: string;
  logo: string;
  description: string;
  admin: string;
}
