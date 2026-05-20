import { BlockchainService } from "./BlockchainService";

export interface TxLookupArgs {
  adapterContract: string;
  adapterContractPackageId?: string;
  walletAddresses: string[];
  startBlock: number;
  endBlock: number;
  cursor?: string;
}

export interface NormalizedContractTx {
  blockNumber: number;
  blockTimestamp: number;
  hash: string;
  from: string;
  to: string;
  data: string;
  gasLimit: string;
  gasPrice: string;
  isFailed: boolean;
  gasUsed: number;
  events?: unknown;
}

export interface TxLookupPage {
  data: NormalizedContractTx[];
  hasNextPage: boolean;
  nextCursor?: string;
}

export interface TxLookup {
  fetchPage(args: TxLookupArgs): Promise<TxLookupPage>;
}

export interface BlockchainServiceWithTxLookup extends BlockchainService {
  readonly txLookup: TxLookup;
}
