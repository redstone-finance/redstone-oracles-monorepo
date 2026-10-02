import { Provider } from "@ethersproject/abstract-provider";
import { Signer } from "@ethersproject/abstract-signer";
import { BigNumber, BigNumberish } from "@ethersproject/bignumber";
import {
  BaseContract,
  CallOverrides,
  ContractTransaction,
  Overrides,
  PayableOverrides,
} from "@ethersproject/contracts";
import { RedstoneCommon } from "@redstone-finance/utils";

export type SamplePointStructOutput = [string, BigNumber] & {
  name: string;
  dataValue: BigNumber;
};

export type SamplePointsStructOutput = [string[], BigNumber[]] & {
  names: string[];
  dataValues: BigNumber[];
};

interface SampleContract extends BaseContract {
  connect(signerOrProvider: Signer | Provider | string): this;
  attach(addressOrName: string): this;
}

export interface SampleRedstoneConsumerNumericMock extends SampleContract {
  latestSavedValue(overrides?: CallOverrides): Promise<BigNumber>;
  getValueForDataFeedId(
    dataFeedId: RedstoneCommon.BytesLike,
    overrides?: CallOverrides
  ): Promise<BigNumber>;
  extractTimestampFromRedstonePayload(overrides?: CallOverrides): Promise<BigNumber>;
  saveOracleValueInContractStorage(
    dataFeedId: RedstoneCommon.BytesLike,
    overrides?: Overrides
  ): Promise<ContractTransaction>;
}

export interface SampleRedstoneConsumerNumericMockManyDataFeeds extends SampleContract {
  firstValue(overrides?: CallOverrides): Promise<BigNumber>;
  secondValue(overrides?: CallOverrides): Promise<BigNumber>;
  timestampFromData(overrides?: CallOverrides): Promise<BigNumber>;
  save2ValuesInStorage(
    dataFeedIds: RedstoneCommon.BytesLike[],
    overrides?: Overrides
  ): Promise<ContractTransaction>;
  save2ValuesAndTimestampInStorage(
    dataFeedIds: RedstoneCommon.BytesLike[],
    overrides?: Overrides
  ): Promise<ContractTransaction>;
  save2ValuesInStorageWithManualPayload(
    dataFeedIds: RedstoneCommon.BytesLike[],
    payload: RedstoneCommon.BytesLike,
    overrides?: Overrides
  ): Promise<ContractTransaction>;
}

export interface SampleRedstoneDataServiceConsumerMock extends SampleRedstoneConsumerNumericMockManyDataFeeds {
  getDataServiceId(overrides?: CallOverrides): Promise<string>;
}

export interface SampleRedstoneConsumerBytesMock extends SampleContract {
  latestSavedValue(overrides?: CallOverrides): Promise<BigNumber>;
  saveOracleValueInContractStorage(
    dataFeedId: RedstoneCommon.BytesLike,
    overrides?: Overrides
  ): Promise<ContractTransaction>;
}

export interface SampleRedstoneConsumerBytesMockStrings extends SampleContract {
  latestString(overrides?: CallOverrides): Promise<string>;
  saveLatestValueInStorage(
    dataFeedId: RedstoneCommon.BytesLike,
    overrides?: Overrides
  ): Promise<ContractTransaction>;
}

export interface SampleRedstoneConsumerBytesMockManyDataFeeds extends SampleContract {
  firstValue(overrides?: CallOverrides): Promise<string>;
  secondValue(overrides?: CallOverrides): Promise<string>;
  save2ValuesInStorage(
    dataFeedIds: RedstoneCommon.BytesLike[],
    overrides?: Overrides
  ): Promise<ContractTransaction>;
}

export interface SampleNumericArrayLib extends SampleContract {
  cachedMedian(overrides?: CallOverrides): Promise<BigNumber>;
  getCachedArray(overrides?: CallOverrides): Promise<BigNumber[]>;
  testArrayUpdatingInStorage(
    arr: BigNumberish[],
    overrides?: Overrides
  ): Promise<ContractTransaction>;
  testMedianSelection(arr: BigNumberish[], overrides?: Overrides): Promise<ContractTransaction>;
  testSortTx(arr: BigNumberish[], overrides?: Overrides): Promise<ContractTransaction>;
}

export interface SampleRedstoneDefaultsLib extends SampleContract {
  aggregateValues(values: BigNumberish[], overrides?: CallOverrides): Promise<BigNumber>;
  validateTimestamp(
    receivedTimestampMilliseconds: BigNumberish,
    overrides?: CallOverrides
  ): Promise<void>;
}

export interface SampleBitmapLib extends SampleContract {
  getBitFromBitmap(
    bitmap: BigNumberish,
    bitIndex: BigNumberish,
    overrides?: CallOverrides
  ): Promise<boolean>;
  setBitInBitmap(
    bitmap: BigNumberish,
    bitIndex: BigNumberish,
    overrides?: CallOverrides
  ): Promise<BigNumber>;
}

export interface SampleForLocalhostMockTest extends SampleContract {
  extractOracleValuesView(
    dataFeedIds: RedstoneCommon.BytesLike[],
    overrides?: CallOverrides
  ): Promise<BigNumber[]>;
}

export interface SampleStorageProxy extends SampleContract {
  register(sampleContract: string, overrides?: Overrides): Promise<ContractTransaction>;
  fetchValueUsingProxyDryRun(
    dataFeedId: RedstoneCommon.BytesLike,
    overrides?: Overrides
  ): Promise<BigNumber>;
  fetchValuesUsingProxyDryRun(
    dataFeedIds: RedstoneCommon.BytesLike[],
    overrides?: Overrides
  ): Promise<BigNumber[]>;
  fetchStructUsingProxyDryRun(
    dataFeedId: RedstoneCommon.BytesLike,
    overrides?: Overrides
  ): Promise<SamplePointStructOutput>;
  fetchArrayOfStructsUsingProxyDryRun(
    dataFeedIds: RedstoneCommon.BytesLike[],
    overrides?: Overrides
  ): Promise<SamplePointStructOutput[]>;
  fetchStructOfArraysUsingProxyDryRun(
    dataFeedIds: RedstoneCommon.BytesLike[],
    overrides?: Overrides
  ): Promise<SamplePointsStructOutput>;
  saveOracleValueInContractStorage(
    dataFeedId: RedstoneCommon.BytesLike,
    overrides?: Overrides
  ): Promise<ContractTransaction>;
  saveOracleValuesInContractStorage(
    dataFeedIds: RedstoneCommon.BytesLike[],
    overrides?: Overrides
  ): Promise<ContractTransaction>;
}

export interface SampleStorageProxyConsumer extends SampleContract {
  checkOracleValue(
    dataFeedId: RedstoneCommon.BytesLike,
    expectedValue: BigNumberish,
    overrides?: CallOverrides
  ): Promise<void>;
  checkOracleValues(
    dataFeedIds: RedstoneCommon.BytesLike[],
    expectedValues: BigNumberish[],
    overrides?: CallOverrides
  ): Promise<void>;
  getOracleValue(
    dataFeedId: RedstoneCommon.BytesLike,
    overrides?: CallOverrides
  ): Promise<BigNumber>;
}

export interface SampleSyntheticToken extends SampleContract {
  initialize(
    asset: RedstoneCommon.BytesLike,
    name: string,
    symbol: string,
    overrides?: Overrides
  ): Promise<ContractTransaction>;
  balanceOf(account: string, overrides?: CallOverrides): Promise<BigNumber>;
  balanceValueOf(account: string, overrides?: CallOverrides): Promise<BigNumber>;
  collateralOf(account: string, overrides?: CallOverrides): Promise<BigNumber>;
  collateralValueOf(account: string, overrides?: CallOverrides): Promise<BigNumber>;
  debtOf(account: string, overrides?: CallOverrides): Promise<BigNumber>;
  debtValueOf(account: string, overrides?: CallOverrides): Promise<BigNumber>;
  solvencyOf(account: string, overrides?: CallOverrides): Promise<BigNumber>;
  totalValue(overrides?: CallOverrides): Promise<BigNumber>;
  mint(amount: BigNumberish, overrides?: PayableOverrides): Promise<ContractTransaction>;
}

export interface SampleWithEvents extends SampleContract {
  emitEventWithLatestOracleValue(overrides?: Overrides): Promise<ContractTransaction>;
}

export interface SampleProxyConnector extends SampleContract {
  checkOracleValue(
    dataFeedId: RedstoneCommon.BytesLike,
    expectedValue: BigNumberish,
    overrides?: CallOverrides
  ): Promise<void>;
  checkOracleValueLongEncodedFunction(
    asset: RedstoneCommon.BytesLike,
    price: BigNumberish,
    overrides?: Overrides
  ): Promise<ContractTransaction>;
  getOracleValueUsingProxy(
    dataFeedId: RedstoneCommon.BytesLike,
    overrides?: CallOverrides
  ): Promise<BigNumber>;
  proxyEmptyError(overrides?: CallOverrides): Promise<void>;
  proxyTestStringError(overrides?: CallOverrides): Promise<void>;
  requireValueForward(overrides?: PayableOverrides): Promise<ContractTransaction>;
}

export interface SampleProxyConnectorConsumer extends SampleContract {
  getComputationResult(overrides?: CallOverrides): Promise<BigNumber>;
  updateUniqueSignersThreshold(
    newUniqueSignersThreshold: BigNumberish,
    overrides?: Overrides
  ): Promise<ContractTransaction>;
}

export interface SampleChainableProxyConnector extends SampleContract {
  registerNextConnector(
    sampleProxyConnector: string,
    overrides?: Overrides
  ): Promise<ContractTransaction>;
  registerConsumer(
    sampleProxyConnectorConsumer: string,
    overrides?: Overrides
  ): Promise<ContractTransaction>;
  processOracleValue(
    dataFeedId: RedstoneCommon.BytesLike,
    overrides?: Overrides
  ): Promise<ContractTransaction>;
  processOracleValues(
    dataFeedIds: RedstoneCommon.BytesLike[],
    overrides?: Overrides
  ): Promise<ContractTransaction>;
}

export interface SampleChainableStorageProxy extends SampleContract {
  register(sampleContract: string, overrides?: Overrides): Promise<ContractTransaction>;
  updateUniqueSignersThreshold(
    newUniqueSignersThreshold: BigNumberish,
    overrides?: Overrides
  ): Promise<ContractTransaction>;
  processOracleValue(
    dataFeedId: RedstoneCommon.BytesLike,
    overrides?: Overrides
  ): Promise<ContractTransaction>;
  processOracleValues(
    dataFeedIds: RedstoneCommon.BytesLike[],
    overrides?: Overrides
  ): Promise<ContractTransaction>;
}

export interface SampleChainableStorageProxyConsumer extends SampleContract {
  register(nextContract: string, overrides?: Overrides): Promise<ContractTransaction>;
  getComputationResult(overrides?: CallOverrides): Promise<BigNumber>;
}

export interface SampleDuplicatedDataFeeds extends SampleContract {
  getValuesFromStorage(overrides?: CallOverrides): Promise<BigNumber[]>;
  saveOracleValuesInStorage(
    dataFeedIdsWithDuplicates: RedstoneCommon.BytesLike[],
    overrides?: Overrides
  ): Promise<ContractTransaction>;
}

export interface Benchmark extends SampleContract {
  emptyExtractOracleValues(
    dataFeedIds: RedstoneCommon.BytesLike[],
    overrides?: Overrides
  ): Promise<ContractTransaction>;
  extractOracleValues(
    dataFeedIds: RedstoneCommon.BytesLike[],
    overrides?: Overrides
  ): Promise<ContractTransaction>;
  updateUniqueSignersThreshold(
    newUniqueSignersThreshold: BigNumberish,
    overrides?: Overrides
  ): Promise<ContractTransaction>;
}

export interface HashCalldataModel extends SampleContract {
  sendRequestWith3Args(
    arg1: RedstoneCommon.BytesLike,
    arg2: RedstoneCommon.BytesLike,
    arg3: RedstoneCommon.BytesLike,
    overrides?: Overrides
  ): Promise<ContractTransaction>;
  sendRequestWith5Args(
    arg1: RedstoneCommon.BytesLike,
    arg2: RedstoneCommon.BytesLike,
    arg3: RedstoneCommon.BytesLike,
    arg4: RedstoneCommon.BytesLike,
    arg5: RedstoneCommon.BytesLike,
    overrides?: Overrides
  ): Promise<ContractTransaction>;
  executeRequestWith3ArgsWithPrices(
    blockNumber: BigNumberish,
    sender: string,
    arg1: RedstoneCommon.BytesLike,
    arg2: RedstoneCommon.BytesLike,
    arg3: RedstoneCommon.BytesLike,
    overrides?: Overrides
  ): Promise<ContractTransaction>;
  executeRequestWith5ArgsWithPrices(
    blockNumber: BigNumberish,
    sender: string,
    arg1: RedstoneCommon.BytesLike,
    arg2: RedstoneCommon.BytesLike,
    arg3: RedstoneCommon.BytesLike,
    arg4: RedstoneCommon.BytesLike,
    arg5: RedstoneCommon.BytesLike,
    overrides?: Overrides
  ): Promise<ContractTransaction>;
  setDeleteFromStorage(
    deleteFromStorage: boolean,
    overrides?: Overrides
  ): Promise<ContractTransaction>;
}

export interface StorageStructureModel extends SampleContract {
  sendRequestWith3Args(
    arg1: RedstoneCommon.BytesLike,
    arg2: RedstoneCommon.BytesLike,
    arg3: RedstoneCommon.BytesLike,
    overrides?: Overrides
  ): Promise<ContractTransaction>;
  sendRequestWith5Args(
    arg1: RedstoneCommon.BytesLike,
    arg2: RedstoneCommon.BytesLike,
    arg3: RedstoneCommon.BytesLike,
    arg4: RedstoneCommon.BytesLike,
    arg5: RedstoneCommon.BytesLike,
    overrides?: Overrides
  ): Promise<ContractTransaction>;
  executeRequestWith3ArgsWithPrices(
    requestId: BigNumberish,
    overrides?: Overrides
  ): Promise<ContractTransaction>;
  executeRequestWith5ArgsWithPrices(
    requestId: BigNumberish,
    overrides?: Overrides
  ): Promise<ContractTransaction>;
  setDeleteFromStorage(
    deleteFromStorage: boolean,
    overrides?: Overrides
  ): Promise<ContractTransaction>;
}
