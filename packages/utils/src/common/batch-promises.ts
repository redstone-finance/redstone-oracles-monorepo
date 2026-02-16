import _ from "lodash";
import { assertThenReturnOrFail } from "./errors";
import { sleep } from "./time";

export async function batchPromises<T>(
  batchSize: number,
  msBetweenBatches: number,
  promises: (() => Promise<T>)[],
  failOnError = false
): Promise<Awaited<T>[]> {
  const { results, errors } = await batchPromisesAndSplitSettlements(
    promises,
    batchSize,
    msBetweenBatches
  );

  return assertThenReturnOrFail(results, errors, "batch operation failed", failOnError);
}

export async function batchPromisesAndSplitSettlements<T>(
  promises: (() => Promise<T>)[],
  batchSize: number,
  msBetweenBatches: number
): Promise<{ results: Awaited<T>[]; errors: Error[] }> {
  const results = [];
  const errors = [];
  for (let i = 0; i < promises.length; i += batchSize) {
    if (i !== 0 && msBetweenBatches) {
      await sleep(msBetweenBatches);
    }
    const batch = promises.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(batch.map((f) => f()));
    const [filteredResults, filteredErrors] = _.partition(
      batchResults,
      (result) => result.status === "fulfilled"
    );
    results.push(...filteredResults.map((result) => result.value));
    errors.push(...filteredErrors.map((r) => r.reason as Error));
  }

  return { results, errors };
}

export async function splitAllSettled<T>(promises: (() => Promise<T>)[]) {
  return await batchPromisesAndSplitSettlements(promises, promises.length, 0);
}
