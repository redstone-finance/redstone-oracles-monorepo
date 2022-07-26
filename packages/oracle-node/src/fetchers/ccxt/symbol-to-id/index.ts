import ccxt from "ccxt";
import exchanges from "../all-supported-exchanges.json";

type MappingsForCCXT = Partial<{
  [exchangeId in ccxt.ExchangeId]: {
    [symbolId in string]: string;
  };
}>;

const mappings: MappingsForCCXT = {};

for (const exchangeId of exchanges) {
  mappings[exchangeId as ccxt.ExchangeId] = require(`./${exchangeId}.json`);
}

export default mappings;
