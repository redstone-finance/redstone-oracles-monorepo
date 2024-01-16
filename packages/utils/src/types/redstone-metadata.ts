// move to common packages when it will be merged ...
export type MetadataForRedstonePrice = {
  nodeLabel: string;

  /** Aggregated value represented as decimal with '.' decimal point separator */
  value: string;

  /** Metadata per source */
  sourceMetadata: Record<string, MetadataPerSource | undefined>;
};

export interface MetadataPerSource {
  /** Info about slippage. Defined only for sources which supports calculating slippage. */
  slippage?: SlippageData[];

  /** Defined only for sources which supports fetching liquidity. */
  liquidity?: string;

  /** Defined for all sources. If source failed value will be = "error"  */
  value?: string;

  /** Info about current bid and ask prices. Defined only for sources that allow retrieval of this data */
  bidAskInfo?: BidAskData;
}

export interface SlippageData {
  slippageAsPercent: string;
  direction: TradeDirections;
  simulationValueInUsd: string;
}

export interface BidAskData {
  bidPrice: number;
  askPrice: number;
}

export enum TradeDirection {
  BUY = "buy",
  SELL = "sell",
}
export type TradeDirections = `${TradeDirection}`;
