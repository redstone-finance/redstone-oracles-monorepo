import { loggerFactory } from "../logger";
import { waitForSuccess } from "./retry";

const DEFAULT_MAX_ITERATION_COUNT = 120;
const DEFAULT_WAITING_INTERVAL_MS = 500;

const logger = loggerFactory("waitForBlockNumber");

export async function waitForBlockNumber(
  getBlockNumber: () => Promise<number>,
  blockNumberToWaitFor: number | undefined,
  description = "",
  waitingIntervalMs = DEFAULT_WAITING_INTERVAL_MS,
  maxIterationCount = DEFAULT_MAX_ITERATION_COUNT
) {
  if (!blockNumberToWaitFor) {
    return;
  }

  await waitForSuccess(
    (iterationIndex) =>
      getBlockNumberWithLog(
        getBlockNumber,
        blockNumberToWaitFor,
        description,
        iterationIndex
      ),
    maxIterationCount,
    `[${description}] Didn't achieve block number ${blockNumberToWaitFor} in ${(maxIterationCount * waitingIntervalMs) / 1000} [s]`,
    waitingIntervalMs,
    description
  );
}

async function getBlockNumberWithLog(
  getBlockNumber: () => Promise<number>,
  blockNumberToWaitFor: number,
  description = "",
  iterationIndex?: number
) {
  const currentBlockNumber = await getBlockNumber();
  const isConditionFulfilled = currentBlockNumber >= blockNumberToWaitFor;

  (iterationIndex ? logger.info : logger.debug)(
    `[${description}] Iteration #${iterationIndex} Current block number: ${currentBlockNumber}` +
      (!isConditionFulfilled
        ? ` (missing: ${blockNumberToWaitFor - currentBlockNumber})`
        : "")
  );

  return isConditionFulfilled;
}
