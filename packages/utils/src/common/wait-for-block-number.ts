import { waitForSuccess } from "./retry";

const DEFAULT_MAX_ITERATION_COUNT = 120;
const DEFAULT_WAITING_INTERVAL_MS = 500;

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
    async () => (await getBlockNumber()) >= blockNumberToWaitFor,
    maxIterationCount,
    `[${description}] Didn't achieve block number ${blockNumberToWaitFor} in ${(maxIterationCount * waitingIntervalMs) / 1000} [s]`,
    waitingIntervalMs,
    description
  );
}
