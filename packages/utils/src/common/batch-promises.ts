import _ from "lodash";
import { assertThenReturnOrFail } from "./errors";
import { sleep } from "./time";

export async function batchPromises<T>(
  batchSize: number,
  msBetweenBatches: number,
  promises: (() => Promise<T>)[],
  failOnError = false
): Promise<Awaited<T>[]> {
  const batchResults = await batchSettled(promises, batchSize, msBetweenBatches);

  return splitSettlementsAndAssert(batchResults, failOnError);
}

export async function batchSettled<T>(
  promises: (() => Promise<T>)[],
  batchSize: number,
  msBetweenBatches = 0
) {
  const batches = _.chunk(promises, batchSize);

  return await runPromiseBatches(batches, msBetweenBatches);
}

export async function runPromiseBatches<T>(batches: (() => Promise<T>)[][], msBetweenBatches = 0) {
  const batchResults = [];
  for (let i = 0; i < batches.length; i += 1) {
    if (i !== 0 && msBetweenBatches) {
      await sleep(msBetweenBatches);
    }
    batchResults.push(...(await Promise.allSettled(batches[i].map((f) => f()))));
  }

  return batchResults;
}

export async function batchPromisesAndSplitSettlements<T>(
  promises: (() => Promise<T>)[],
  batchSize: number,
  msBetweenBatches = 0
): Promise<{ results: Awaited<T>[]; errors: Error[] }> {
  const batchResults = await batchSettled(promises, batchSize, msBetweenBatches);

  return splitSettlements(batchResults);
}

export async function splitAllSettled<T>(promises: (() => Promise<T>)[]) {
  return await batchPromisesAndSplitSettlements(promises, promises.length, 0);
}

export function splitSettlements<T>(batchResults: PromiseSettledResult<T>[]) {
  const results = [];
  const errors = [];
  const [filteredResults, filteredErrors] = _.partition(
    batchResults,
    (result) => result.status === "fulfilled"
  );
  results.push(...filteredResults.map((result) => result.value));
  errors.push(...filteredErrors.map((r) => r.reason as Error));

  return { results, errors };
}

export function splitSettlementsAndAssert<T>(
  batchResults: PromiseSettledResult<T>[],
  failOnError = false
) {
  const { results, errors } = splitSettlements(batchResults);

  return assertThenReturnOrFail(results, errors, "batch operation failed", failOnError);
}
