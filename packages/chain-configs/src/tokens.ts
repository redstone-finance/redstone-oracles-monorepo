import { getChainTokenMap } from "./chain-token-map";
import { SupportedNetworkNames } from "./schemas";

type TokenInfo = {
  symbol: string;
  address: string;
  decimals: number;
};

export function getTokenInfo(networkName: SupportedNetworkNames, symbol: string): TokenInfo {
  const networkTokens = getChainTokenMap()[networkName];
  if (!networkTokens) {
    throw new Error(`Chain ${networkName} not found in chainTokenMap`);
  }
  if (!Object.keys(networkTokens).includes(symbol)) {
    throw new Error(`Token ${symbol} not found on ${networkName}, check getTokenInfo function`);
  }
  const token = networkTokens[symbol];
  const tokenInfo: TokenInfo = {
    symbol,
    ...token,
  };
  return tokenInfo;
}

let allTokenSymbols: Set<string> | null = null;

export const getAllTokenSymbols = (): Set<string> =>
  (allTokenSymbols ??= new Set(
    Object.values(getChainTokenMap())
      .flatMap((tokenMap) => Object.keys(tokenMap))
      .map((symbol) => symbol.toLowerCase())
  ));
