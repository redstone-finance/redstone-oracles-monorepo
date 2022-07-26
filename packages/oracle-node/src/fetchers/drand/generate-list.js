import { ENTROPY_SYMBOL } from "./DrandFetcher";

async function getTokenList() {
  return [ENTROPY_SYMBOL];
}

exports.getTokenList = getTokenList;
