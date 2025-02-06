import { BigNumber } from "ethers";
import { MultiExecutor } from "../../src";
import {
  AsyncFn,
  DEFAULT_CONFIG,
  ExecutionMode,
  Executor,
  MethodConfig,
  MultiExecutorConfig,
} from "../../src/multi-executor";
import { MockClient } from "./MockClient";

const EXEC_TIME = 20;
const CLIENTS = [
  new MockClient(0, EXEC_TIME * 2),
  new MockClient(1, EXEC_TIME),
  new MockClient(2, EXEC_TIME * 3),
];

const FAILING_AND_CLIENTS = [new MockClient(8, 0, true), ...CLIENTS];
const CLIENTS_AND_FAILING = [
  ...CLIENTS,
  new MockClient(9, 2.5 * EXEC_TIME, true),
];
const FAILING_AND_CLIENTS_AND_FAILING = [
  new MockClient(8, 0, true),
  ...CLIENTS,
  new MockClient(9, 2.5 * EXEC_TIME, true),
];

describe("MultiExecutor", () => {
  const config: MultiExecutor.MethodConfig<MockClient> = {
    someAsyncFunction: MultiExecutor.ExecutionMode.RACE,
    someNumberFunction: MultiExecutor.ExecutionMode.CONSENSUS_MEDIAN,
    someHexFunction: MultiExecutor.ExecutionMode.CONSENSUS_MEDIAN,
  };

  it("Should properly pick first non-failing value", async () => {
    for (const instances of [
      CLIENTS,
      CLIENTS_AND_FAILING,
      FAILING_AND_CLIENTS,
      FAILING_AND_CLIENTS_AND_FAILING,
      [CLIENTS[0]],
    ]) {
      const sut = makeSut(instances);

      const result = await sut.someAsyncFunction("xxx");
      expect(result).toEqual("0#xxx");

      instances.forEach((instance, index) => {
        expect(instance.calledArgs).toStrictEqual(
          index > instances.indexOf(CLIENTS[0]) ? [] : ["xxx"]
        );
      });
    }
  });

  it("Should properly pick first non-failing value with timeout", async () => {
    for (const instances of [
      CLIENTS,
      CLIENTS_AND_FAILING,
      FAILING_AND_CLIENTS,
      FAILING_AND_CLIENTS_AND_FAILING,
      [CLIENTS[1]],
    ]) {
      const sut = makeSut(
        instances,
        {
          someAsyncFunction: ExecutionMode.FALLBACK,
        },
        {
          ...DEFAULT_CONFIG,
          singleExecutionTimeoutMs: EXEC_TIME + 2,
        }
      );

      const result = await sut.someAsyncFunction("xxx");
      expect(result).toEqual("1#xxx");

      instances.forEach((instance, index) => {
        expect(instance.calledArgs).toStrictEqual(
          index > instances.indexOf(CLIENTS[1]) ? [] : ["xxx"]
        );
      });
    }
  });

  it("Should properly pick fastest value", async () => {
    for (const instances of [
      CLIENTS,
      FAILING_AND_CLIENTS,
      CLIENTS_AND_FAILING,
      FAILING_AND_CLIENTS_AND_FAILING,
      [CLIENTS[1]],
    ]) {
      const sut = makeSut(instances, config);

      const result = await sut.someAsyncFunction("xxx");
      expect(result).toEqual("1#xxx");

      instances.forEach((instance) => {
        expect(instance.calledArgs).toStrictEqual(["xxx"]);
      });
    }
  });

  it("Should properly pick median number value", async () => {
    for (const instances of [
      CLIENTS,
      FAILING_AND_CLIENTS,
      CLIENTS_AND_FAILING,
      FAILING_AND_CLIENTS_AND_FAILING,
      [new MockClient(1, 0), ...CLIENTS],
      [new MockClient(1, 3 * EXEC_TIME), new MockClient(3, 0), ...CLIENTS],
      [CLIENTS[1]],
    ]) {
      const sut = makeSut(instances, config);

      const result = await sut.someNumberFunction(345);
      expect(result).toEqual(345001);

      instances.forEach((instance) => {
        expect(instance.calledArgs).toStrictEqual([345]);
      });
    }
  });

  it("Should properly pick median hex value", async () => {
    for (const instances of [
      CLIENTS,
      FAILING_AND_CLIENTS,
      CLIENTS_AND_FAILING,
      FAILING_AND_CLIENTS_AND_FAILING,
      [new MockClient(1, 0), ...CLIENTS],
      [new MockClient(1, 3 * EXEC_TIME), new MockClient(3, 0), ...CLIENTS],
      [CLIENTS[1]],
    ]) {
      const sut = makeSut(instances, config);

      const result = await sut.someHexFunction("0x1234");
      expect(result).toEqual(BigNumber.from("0x123401").toNumber());

      const result2 = await sut.someHexFunction("0x1fffffffffff");
      expect(result2).toEqual(BigNumber.from("0x1fffffffffff01").toNumber());

      const result3 = await sut.someHexFunction("1234");
      expect(result3).toEqual(BigNumber.from("123401").toNumber());

      instances.forEach((instance) => {
        expect(instance.calledArgs).toStrictEqual([
          "0x1234",
          "0x1fffffffffff",
          "1234",
        ]);
      });
    }
  });

  it("Should fail when no quorum is achieved of 3 elements", async () => {
    const instances = [
      new MockClient(1, 3 * EXEC_TIME, true),
      new MockClient(1, 0, true),
      CLIENTS[1],
    ];
    const sut = makeSut(instances, config);

    await expect(sut.someHexFunction("1234")).rejects.toThrowError(
      "Consensus failed: got 1 successful result, needed at least 2 (2 failed with"
    );
  });

  it("Should fail when no quorum is achieved of 5 elements", async () => {
    const instances = [
      new MockClient(7, 3 * EXEC_TIME, true),
      new MockClient(8, 0, true),
      new MockClient(9, 0, true),
      CLIENTS[1],
      CLIENTS[2],
    ];
    const sut = makeSut(instances, config);

    await expect(sut.someHexFunction("1234")).rejects.toThrowError(
      "Consensus failed: got 2 successful results, needed at least 3 (3 failed with"
    );
  });

  it("Should fail when no quorum is achieved with 100% of elements required", async () => {
    const instances = [...CLIENTS, new MockClient(1, 3 * EXEC_TIME, true)];
    const sut = makeSut(instances, config, {
      ...DEFAULT_CONFIG,
      quorumRatio: 1,
    });

    await expect(sut.someHexFunction("1234")).rejects.toThrowError(
      "Consensus failed: got 3 successful results, needed at least 4 (1 failed with"
    );
  });

  it("Should properly pick all equals value", async () => {
    for (const instances of [
      [
        new MockClient(1, 0),
        CLIENTS[1],
        new MockClient(1, EXEC_TIME, true),
        new MockClient(1, 1.5 * EXEC_TIME, true),
        new MockClient(1, 2.5 * EXEC_TIME),
      ],
      [
        new MockClient(1, 0),
        CLIENTS[1],
        new MockClient(1, EXEC_TIME),
        new MockClient(2, 2 * EXEC_TIME, true),
      ],
      [CLIENTS[1]],
    ]) {
      const sut = makeSut(instances, {
        ...config,
        someNumberFunction: ExecutionMode.CONSENSUS_ALL_EQUALS,
      });

      const result = await sut.someNumberFunction(234);
      expect(result).toEqual(234001);

      instances.forEach((instance) => {
        expect(instance.calledArgs).toStrictEqual([234]);
      });
    }
  });

  it("Should fail when one of values is different", async () => {
    const sut = makeSut(
      [new MockClient(1, 3 * EXEC_TIME, true), CLIENTS[2], CLIENTS[1]],
      {
        ...config,
        someHexFunction: ExecutionMode.CONSENSUS_ALL_EQUALS,
      }
    );

    await expect(sut.someHexFunction("1234")).rejects.toThrowError(
      `Results are not equal. Found 2 different results ["123402","123401"]`
    );
  });

  it("Should properly use custom executor", async () => {
    for (const instances of [
      CLIENTS,
      FAILING_AND_CLIENTS,
      FAILING_AND_CLIENTS_AND_FAILING,
      [new MockClient(1, 0), ...CLIENTS],
      [new MockClient(1, 3 * EXEC_TIME), new MockClient(3, 0), ...CLIENTS],
      [CLIENTS[2]],
    ]) {
      const sut = makeSut(instances, {
        ...config,
        someHexFunction: new CustomExecutor(),
      });

      const result = await sut.someHexFunction("0x1234");
      expect(result).toEqual("0x123402");

      instances.forEach((instance) => {
        expect(instance.calledArgs).toStrictEqual(["0x1234"]);
      });
    }
  });

  it("Should fail with all fallback fails with more functions", async () => {
    const sut = makeSut([
      new MockClient(1, 3 * EXEC_TIME, true),
      new MockClient(3, 0, true),
    ]);

    await expect(sut.someHexFunction("1234")).rejects.toThrowError(
      `All promises failed`
    );
  });

  it("Should fail with fallback fails with one function", async () => {
    const sut = makeSut([new MockClient(1, 3 * EXEC_TIME, true)]);

    await expect(sut.someHexFunction("1234")).rejects.toThrowError(
      `All promises failed`
    );
  });

  it("Should fail with all executions timeout", async () => {
    const sut = makeSut(CLIENTS, config, {
      ...DEFAULT_CONFIG,
      allExecutionsTimeoutMs: EXEC_TIME + 2,
    });

    await expect(sut.someHexFunction("1234")).rejects.toThrowError(
      `Timeout error 22 [MS]`
    );
  });

  function makeSut(
    instances: MockClient[],
    methodConfig: MethodConfig<MockClient> = {},
    config: MultiExecutorConfig = DEFAULT_CONFIG
  ) {
    instances.forEach((client) => (client.calledArgs = []));

    return MultiExecutor.create(instances, methodConfig, config);
  }
});

class CustomExecutor extends Executor {
  // eslint-disable-next-line @typescript-eslint/class-methods-use-this
  async execute<R>(promiseCreators: AsyncFn<R>[]): Promise<R> {
    let result = undefined;
    for (const promiseCreator of promiseCreators) {
      try {
        result = await promiseCreator();
      } catch {
        /* empty */
      }
    }

    if (!result) {
      throw new Error(`All promises failed`);
    }

    return result;
  }
}
