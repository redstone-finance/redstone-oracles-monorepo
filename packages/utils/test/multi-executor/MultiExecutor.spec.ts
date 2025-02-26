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

  it("Should be able to pick primitive property", () => {
    const sut = makeSut(CLIENTS);

    expect(sut.that.property).toEqual(12);
  });

  it("Race should properly pick first non-failing value", async () => {
    for (const instances of [
      CLIENTS,
      CLIENTS_AND_FAILING,
      FAILING_AND_CLIENTS,
      FAILING_AND_CLIENTS_AND_FAILING,
      [CLIENTS[0]],
    ]) {
      const sut = makeSut(instances);

      const result = await sut.that.that.someAsyncFunction("xxx");
      expect(result).toEqual("0#xxx");

      instances.forEach((instance, index) => {
        expect(instance.calledArgs).toStrictEqual(
          index > instances.indexOf(CLIENTS[0]) ? [] : ["xxx"]
        );
      });
    }
  });

  it("Fallback should properly pick first non-failing value with timeout", async () => {
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

      const result =
        await sut.that.that.that.that.that.someAsyncFunction("xxx");
      expect(result).toEqual("1#xxx");

      instances.forEach((instance, index) => {
        expect(instance.calledArgs).toStrictEqual(
          index > instances.indexOf(CLIENTS[1]) ? [] : ["xxx"]
        );
      });
    }
  });

  it("Race should properly pick fastest value", async () => {
    for (const instances of [
      CLIENTS,
      FAILING_AND_CLIENTS,
      CLIENTS_AND_FAILING,
      FAILING_AND_CLIENTS_AND_FAILING,
      [CLIENTS[1]],
    ]) {
      const sut = makeSut(instances, config);

      const result = await sut.that.someAsyncFunction("xxx");
      expect(result).toEqual("1#xxx");

      instances.forEach((instance) => {
        expect(instance.calledArgs).toStrictEqual(["xxx"]);
      });
    }
  });

  it("Consensus should properly pick median number value", async () => {
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

      const result = await sut.that.someNumberFunction(345);
      expect(result).toEqual(345001);

      instances.forEach((instance) => {
        expect(instance.calledArgs).toStrictEqual([345]);
      });
    }
  });

  it("CeilMedianConsensusExecutor should properly pick ceil of median number", async () => {
    for (const instances of [
      CLIENTS,
      [CLIENTS[0], CLIENTS[1]],
      [new MockClient(8, 0, true), CLIENTS[0], CLIENTS[1]],
    ]) {
      const sut = makeSut(instances, {
        ...config,
        someNumberFunction: new MultiExecutor.CeilMedianConsensusExecutor(
          MultiExecutor.DEFAULT_CONFIG.consensusQuorumRatio,
          EXEC_TIME * 2.5
        ),
      });

      const result = await sut.that.someNumberFunction(345);
      expect(result).toEqual(345001);

      instances.forEach((instance) => {
        expect(instance.calledArgs).toStrictEqual([345]);
      });
    }
  });

  it("Consensus should properly pick median hex value", async () => {
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

      const result = await sut.that.someHexFunction("0x1234");
      expect(result).toEqual(BigNumber.from("0x123401").toNumber());

      const result2 = await sut.that.someHexFunction("0x1fffffffffff");
      expect(result2).toEqual(BigNumber.from("0x1fffffffffff01").toNumber());

      const result3 = await sut.that.someHexFunction("1234");
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

  it("Consensus should fail when no quorum is achieved of 3 elements", async () => {
    const instances = [
      new MockClient(1, 3 * EXEC_TIME, true),
      new MockClient(1, 0, true),
      CLIENTS[1],
    ];
    const sut = makeSut(instances, config);

    await expect(sut.that.someHexFunction("1234")).rejects.toThrowError(
      "Consensus failed: got 1 successful result, needed at least 2; AggregateError: 2 fails, errors: Error: 123401"
    );
  });

  it("Consensus should fail when no quorum is achieved of 5 elements", async () => {
    const instances = [
      new MockClient(7, 3 * EXEC_TIME, true),
      new MockClient(8, 0, true),
      new MockClient(9, 0, true),
      CLIENTS[1],
      CLIENTS[2],
    ];
    const sut = makeSut(instances, config);

    await expect(sut.that.someHexFunction("1234")).rejects.toThrowError(
      "Consensus failed: got 2 successful results, needed at least 3; AggregateError: 3 fails, errors: Error: 123408"
    );
  });

  it("Consensus should fail when no quorum is achieved with 100% of elements required", async () => {
    const instances = [...CLIENTS, new MockClient(1, 3 * EXEC_TIME, true)];
    const sut = makeSut(instances, config, {
      ...DEFAULT_CONFIG,
      consensusQuorumRatio: 1,
    });

    await expect(sut.that.someHexFunction("1234")).rejects.toThrowError(
      "Consensus failed: got 3 successful results, needed at least 4; AggregateError: 1 fail, errors: Error: 123401"
    );
  });

  it("Consensus should properly pick all equals value", async () => {
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
        someNumberFunction: ExecutionMode.CONSENSUS_ALL_EQUAL,
      });

      const result = await sut.that.someNumberFunction(234);
      expect(result).toEqual(234001);

      instances.forEach((instance) => {
        expect(instance.calledArgs).toStrictEqual([234]);
      });
    }
  });

  it("Consensus should fail when one of values is different", async () => {
    const sut = makeSut(
      [new MockClient(1, 3 * EXEC_TIME, true), CLIENTS[2], CLIENTS[1]],
      {
        ...config,
        someHexFunction: ExecutionMode.CONSENSUS_ALL_EQUAL,
      }
    );

    await expect(sut.that.someHexFunction("1234")).rejects.toThrowError(
      `Results are not equal. Found 2 different results ["123401","123402"]`
    );
  });

  it("Consensus should fail when all functions fail", async () => {
    const sut = makeSut([
      new MockClient(1, 3 * EXEC_TIME, true),
      new MockClient(3, 0, true),
    ]);

    await expect(sut.that.someHexFunction("1234")).rejects.toThrowError(
      `All promises failed`
    );
  });

  it("Consensus should fail when only existing function fails", async () => {
    const sut = makeSut([new MockClient(1, 3 * EXEC_TIME, true)]);

    await expect(sut.that.someHexFunction("1234")).rejects.toThrowError(
      `All promises failed`
    );
  });

  it("Consensus should fail with all execution timeouts", async () => {
    const sut = makeSut(CLIENTS, config, {
      ...DEFAULT_CONFIG,
      singleExecutionTimeoutMs: EXEC_TIME - 2,
    });

    await expect(sut.that.someHexFunction("1234")).rejects.toThrowError(
      `Consensus failed: got 0 successful results`
    );
  });

  it("Consensus should fail with total executions timeout", async () => {
    const sut = makeSut(CLIENTS, config, {
      ...DEFAULT_CONFIG,
      allExecutionsTimeoutMs: EXEC_TIME + 2,
    });

    await expect(sut.that.someHexFunction("1234")).rejects.toThrowError(
      `Timeout error 22 [MS]`
    );
  });

  it("Race should fail with total executions timeout", async () => {
    const sut = makeSut(CLIENTS, config, {
      ...DEFAULT_CONFIG,
      allExecutionsTimeoutMs: EXEC_TIME - 2,
    });

    await expect(sut.that.someAsyncFunction("xxx")).rejects.toThrowError(
      `Timeout error 18 [MS]`
    );
  });

  it("Fallback should fail with total executions timeout", async () => {
    const sut = makeSut(
      CLIENTS,
      { ...config, someAsyncFunction: ExecutionMode.FALLBACK },
      {
        ...DEFAULT_CONFIG,
        allExecutionsTimeoutMs: EXEC_TIME + 2,
      }
    );

    await expect(sut.that.someAsyncFunction("xxx")).rejects.toThrowError(
      `Timeout error 22 [MS]`
    );
  });

  it("Agreement should fail with total executions timeout", async () => {
    const sut = makeSut(
      CLIENTS,
      { ...config, someNumberFunction: ExecutionMode.AGREEMENT },
      {
        ...DEFAULT_CONFIG,
        allExecutionsTimeoutMs: EXEC_TIME - 2,
        consensusQuorumRatio: 0.25,
      }
    );

    await expect(sut.that.someNumberFunction(234)).rejects.toThrowError(
      `Timeout error 18 [MS]`
    );
  });

  it("Custom executor should pick proper value", async () => {
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

      const result = await sut.that.someHexFunction("0x1234");
      expect(result).toEqual("0x123402");

      instances.forEach((instance) => {
        expect(instance.calledArgs).toStrictEqual(["0x1234"]);
      });
    }
  });

  it("Agreement should pick mode value", async () => {
    for (const instances of [
      [CLIENTS[0]],
      [CLIENTS[0], CLIENTS[1], new MockClient(0, 0)],
      [
        CLIENTS[0],
        CLIENTS[1],
        new MockClient(0, 0),
        new MockClient(0, EXEC_TIME * 2, false),
        new MockClient(1, EXEC_TIME, true),
      ],
      [CLIENTS[0], new MockClient(0, 0), new MockClient(0, 0, true)],
    ]) {
      const sut = makeSut(instances, {
        ...config,
        someNumberFunction: ExecutionMode.AGREEMENT,
      });

      const result = await sut.that.someNumberFunction(234);
      expect(result).toEqual(234000);

      instances.forEach((instance) => {
        expect(instance.calledArgs).toStrictEqual([234]);
      });
    }
  });

  it("Agreement should pick the fastest mode value when quorum is achieved", async () => {
    for (const instances of [
      [CLIENTS[0], CLIENTS[1], new MockClient(0, 0), new MockClient(1, 0)],
      [
        CLIENTS[0],
        CLIENTS[1],
        new MockClient(0, EXEC_TIME * 2.5, true),
        new MockClient(1, 0),
      ],
    ]) {
      const sut = makeSut(
        instances,
        {
          ...config,
          someNumberFunction: ExecutionMode.AGREEMENT,
        },
        { ...DEFAULT_CONFIG, agreementQuorumNumber: 2 }
      );

      const result = await sut.that.someNumberFunction(234);
      expect(result).toEqual(234001);

      instances.forEach((instance) => {
        expect(instance.calledArgs).toStrictEqual([234]);
      });
    }
  });

  it("Agreement should pick the fastest mode value when quorum is achieved for sync values", async () => {
    for (const instances of [
      [CLIENTS[0], CLIENTS[1], new MockClient(0, 0), new MockClient(1, 0)],
    ]) {
      const sut = makeSut(
        instances,
        {
          ...config,
          someNumberFunction: ExecutionMode.AGREEMENT,
        },
        { ...DEFAULT_CONFIG, agreementQuorumNumber: 1 }
      );

      const result = await sut.that.someNumberFunction(234);
      expect(result).toEqual(234000);

      instances.forEach((instance) => {
        expect(instance.calledArgs).toStrictEqual([234]);
      });
    }
  });

  it("Agreement should fail when all values are different", async () => {
    const sut = makeSut(CLIENTS, {
      ...config,
      someHexFunction: ExecutionMode.AGREEMENT,
    });

    await expect(sut.that.someHexFunction("1234")).rejects.toThrowError(
      `Agreement failed: got max 1 equal result, needed at least 2`
    );
  });

  it("Agreement should fail when there's only one value that fails", async () => {
    const sut = makeSut([new MockClient(8, EXEC_TIME, true)], {
      ...config,
      someHexFunction: ExecutionMode.AGREEMENT,
    });

    await expect(sut.that.someHexFunction("1234")).rejects.toThrowError(
      `Agreement failed: got max 0 equal results, needed at least 1; AggregateError: 1 fail, errors: Error: 123408`
    );
  });

  it("Race should fail when there's only one value that fails", async () => {
    const sut = makeSut([new MockClient(8, EXEC_TIME, true)], {
      ...config,
      someHexFunction: ExecutionMode.RACE,
    });

    await expect(sut.that.someHexFunction("1234")).rejects.toThrowError(
      `All promises were rejected`
    );
  });

  it("Consensus should fail when there's only one value that fails", async () => {
    const sut = makeSut([new MockClient(8, EXEC_TIME, true)], {
      ...config,
      someHexFunction: ExecutionMode.CONSENSUS_ALL_EQUAL,
    });

    await expect(sut.that.someHexFunction("1234")).rejects.toThrowError(
      `Consensus failed: got 0 successful results, needed at least 1; AggregateError: 1 fail, errors: Error: 123408`
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
