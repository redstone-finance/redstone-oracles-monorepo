import { isPullModelTestCase, isPushModelTestCase } from "./type-guards";
import {
  ContractConfiguration,
  Nested,
  PullModelTestCase,
  PushModelTestCase,
  PushModelTestContext,
} from "./types";

type TestEnvironment = PushTestEnvironment | PullTestEnvironment;
type TestCase = PushModelTestCase | PullModelTestCase;
type TestExecutor<T extends TestEnvironment, U extends TestCase> = (
  env: T,
  test: U
) => Promise<void>;

export interface PushTestEnvironment {
  configure(configuration: ContractConfiguration): Promise<void>;
  update(
    dataFeedIds: string[],
    payloadGenerator: (context: PushModelTestContext) => string,
    instructionsContext: PushModelTestContext[]
  ): Promise<void>;
  read(dataFeedIds: string[]): Promise<number[]>;
  waitForNewBlock(): Promise<void>;
  wait(durationSeconds: number): Promise<void>;
  getCurrentTimeInMs(): Promise<number>;
  finish(): Promise<void>;
}

export interface PullTestEnvironment {
  configure(configuration: ContractConfiguration): Promise<void>;
  pull(dataFeedIds: string[], payloadGenerator: (timestamp: number) => string): Promise<number[]>;
  finish(): Promise<void>;
}

function generateTestsFor<T extends TestEnvironment, U extends TestCase>(
  envProvider: () => Promise<T>,
  describeTitle: string,
  testsConfig: Record<string, Nested<U>>,
  filterOutTests: string[],
  testExecutor: TestExecutor<T, U>,
  testCaseValidator: (config: Nested<U>) => config is U
) {
  const allTests: Array<{ title: string; test: U }> = [];

  function collectTests(config: Record<string, Nested<U>>, pathPrefix: string = "") {
    for (const [title, testConfig] of Object.entries(config)) {
      const fullTitle = pathPrefix ? `${pathPrefix} > ${title}` : title;

      if (testCaseValidator(testConfig)) {
        allTests.push({ title: fullTitle, test: testConfig });
      } else {
        collectTests(testConfig as Record<string, Nested<U>>, fullTitle);
      }
    }
  }

  collectTests(testsConfig);

  const selectRunner = (title: string) => {
    return filterOutTests.every((filterTest) => !title.includes(filterTest)) ? it : it.skip;
  };

  describe(describeTitle, () => {
    for (const { title, test } of allTests) {
      const testRunner = selectRunner(title);

      testRunner(title, async () => {
        await testExecutor(await envProvider(), test);
      });
    }
  });
}

export function generatePushTestsFor(
  envProvider: () => Promise<PushTestEnvironment>,
  describeTitle: string,
  testsConfig: Record<string, Nested<PushModelTestCase>>,
  filterOutTests: string[]
) {
  generateTestsFor(
    envProvider,
    describeTitle,
    testsConfig,
    filterOutTests,
    executePushModel,
    isPushModelTestCase
  );
}

export function generatePullTestsFor(
  envProvider: () => Promise<PullTestEnvironment>,
  describeTitle: string,
  testsConfig: Record<string, Nested<PullModelTestCase>>,
  filterOutTests: string[]
) {
  generateTestsFor(
    envProvider,
    describeTitle,
    testsConfig,
    filterOutTests,
    executePullModel,
    isPullModelTestCase
  );
}

async function executePushModel(env: PushTestEnvironment, pushTestCase: PushModelTestCase) {
  await env.configure(pushTestCase.contractConfiguration);

  const instructionsContext: PushModelTestContext[] = [];

  for (const instruction of pushTestCase.instructions) {
    switch (instruction.type) {
      case "update": {
        const valuesBefore = await env.read(instruction.dataFeedIds);

        try {
          await env.update(
            instruction.dataFeedIds,
            instruction.payloadGenerator,
            instructionsContext
          );

          const newValues = await env.read(instruction.dataFeedIds);
          expect(newValues).toStrictEqual(instruction.expectedValues);
          expect(instruction.expectedSuccess).toBeTruthy();
        } catch {
          expect(instruction.expectedSuccess).toBeFalsy();
          const newValues = await env.read(instruction.dataFeedIds);
          expect(newValues).toStrictEqual(valuesBefore);
        }
        break;
      }
      case "waitfornewblock":
        await env.waitForNewBlock();
        break;
      case "wait":
        await env.wait(instruction.durationSeconds);
        break;
      case "read": {
        let readFailed = false;
        let results;

        try {
          results = await env.read(instruction.dataFeedIds);
        } catch {
          readFailed = true;
        }

        if (readFailed) {
          expect(instruction.expectedSuccess).toBeFalsy();
        } else {
          expect(instruction.expectedSuccess).toBeTruthy();
          if (instruction.expectedSuccess) {
            expect(results).toStrictEqual(instruction.expectedValues);
          }
        }
      }
    }

    instructionsContext.push({
      timestamp: await env.getCurrentTimeInMs(),
      instructions: [],
    });
  }

  await env.finish();
}

async function executePullModel(env: PullTestEnvironment, pullTestCase: PullModelTestCase) {
  await env.configure(pullTestCase.contractConfiguration);

  try {
    const values = await env.pull(pullTestCase.requestedDataFeedIds, pullTestCase.payloadGenerator);

    expect(values).toStrictEqual(pullTestCase.expectedValues);
    expect(pullTestCase.expectedSuccess).toBeTruthy();
  } catch {
    expect(pullTestCase.expectedSuccess).toBeFalsy();
  }

  await env.finish();
}
