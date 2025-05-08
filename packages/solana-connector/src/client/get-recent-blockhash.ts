import { loggerFactory, RedstoneCommon } from "@redstone-finance/utils";
import { SOLANA_SLOT_TIME_INTERVAL_MS, SolanaClient } from "./SolanaClient";

const RETRY_CONFIG: Omit<RedstoneCommon.RetryConfig, "fn"> = {
  maxRetries: 6,
  waitBetweenMs: SOLANA_SLOT_TIME_INTERVAL_MS,
  backOff: {
    backOffBase: 1.5,
  },
};

const logger = loggerFactory("getRecentBlockhash");

export async function getRecentBlockhash(
  client: SolanaClient,
  description: string
) {
  return await RedstoneCommon.retry({
    fn: () => getBlockhash(client, description),
    fnName: "getRecentBlockhash",
    logger: (message) => logger.info(message),
    ...RETRY_CONFIG,
  })();
}

async function getBlockhash(client: SolanaClient, description: string) {
  const desc = `getRecentBlockhash (${description})`;
  try {
    return await client.getBlockhash(undefined, desc);
  } catch (err) {
    logger.warn(`${desc} ${RedstoneCommon.stringify(err)}`);
    const slotNumber = await client.getSlot();

    return await client.getBlockhash(slotNumber, desc);
  }
}
