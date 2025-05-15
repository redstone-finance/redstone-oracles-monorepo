import { MultiExecutor } from "../../src";
import { DEFAULT_CONFIG } from "../../src/multi-executor";
import { MockClient } from "./MockClient";
import { makeSut } from "./MultiExecutor.spec";

class ArrayMockClient extends MockClient {
  constructor(
    private value: (string | undefined)[],
    ident: number,
    execTime: number,
    isFailing: boolean = false
  ) {
    super(ident, execTime, isFailing);
  }

  async someArrayFunction() {
    await this.invoke(this.ident);

    const result = this.value;
    if (this.isFailing) {
      throw new Error(result.toString());
    }

    return result;
  }
}

const EXEC_TIME = 20;
const ABC = ["A", "B", "C"];
const UNDEF = [undefined, undefined, undefined];
const CLIENTS = [
  new ArrayMockClient(ABC, 0, EXEC_TIME * 2),
  new ArrayMockClient(ABC, 1, EXEC_TIME),
  new ArrayMockClient(ABC, 2, EXEC_TIME * 3),
];

describe("MultiAgreementExecutor", () => {
  const config: MultiExecutor.NestedMethodConfig<ArrayMockClient> = {
    someArrayFunction: MultiExecutor.ExecutionMode.MULTI_AGREEMENT,
  };

  it("MultiAgreement should pick mode value", async () => {
    for (const instances of [
      CLIENTS,
      [
        new ArrayMockClient(["A", "B"], 0, EXEC_TIME * 2),
        CLIENTS[1],
        new ArrayMockClient([undefined, "B", "C"], 2, 3 * EXEC_TIME),
      ],
      [CLIENTS[0], new ArrayMockClient(UNDEF, 1, 0), CLIENTS[2]],
      [CLIENTS[0], new ArrayMockClient(UNDEF, 1, 4 * EXEC_TIME), CLIENTS[2]],
      [CLIENTS[0], CLIENTS[1], new ArrayMockClient([], 2, 3 * EXEC_TIME, true)],
      [
        new ArrayMockClient(["A", "B"], 0, EXEC_TIME * 2),
        new ArrayMockClient([undefined, "B", "C"], 1, EXEC_TIME),
        new ArrayMockClient(["A", undefined, "C"], 2, 3 * EXEC_TIME),
      ],
    ]) {
      const sut = makeSut(instances, {
        ...config,
      });

      const result = await sut.someArrayFunction();
      expect(result).toStrictEqual(ABC);

      instances.forEach((instance) => {
        expect(instance.calledArgs).toStrictEqual([instance.ident]);
      });
    }
  });

  it("MultiAgreement should pick mode even when it's undefined", async () => {
    for (const instances of [
      [
        new ArrayMockClient(["A"], 0, EXEC_TIME * 2),
        new ArrayMockClient([undefined, "B", undefined], 1, EXEC_TIME),
        new ArrayMockClient([undefined, undefined, "C"], 2, 3 * EXEC_TIME),
      ],
      [
        new ArrayMockClient(UNDEF, 0, EXEC_TIME * 2),
        new ArrayMockClient(UNDEF, 1, EXEC_TIME),
        new ArrayMockClient(UNDEF, 2, 3 * EXEC_TIME),
      ],
    ]) {
      const sut = makeSut(instances, config);

      const result = await sut.someArrayFunction();
      expect(result).toStrictEqual(UNDEF);

      instances.forEach((instance) => {
        expect(instance.calledArgs).toStrictEqual([instance.ident]);
      });
    }
  });

  it("MultiAgreement should pick mode from empty arrays", async () => {
    for (const instances of [
      [
        new ArrayMockClient([], 0, EXEC_TIME * 2),
        new ArrayMockClient([], 1, EXEC_TIME),
        new ArrayMockClient([], 2, 3 * EXEC_TIME),
      ],
    ]) {
      const sut = makeSut(instances, config);

      const result = await sut.someArrayFunction();
      expect(result).toStrictEqual([]);

      instances.forEach((instance) => {
        expect(instance.calledArgs).toStrictEqual([instance.ident]);
      });
    }
  });

  it("MultiAgreement should pick undefined from unagreed values when shouldResolveUnagreedToUndefined is set to true", async () => {
    for (const instances of [
      [
        new ArrayMockClient(ABC, 0, EXEC_TIME * 2),
        new ArrayMockClient(["D", "B", undefined], 1, EXEC_TIME),
        new ArrayMockClient(["E", undefined, "C"], 2, 3 * EXEC_TIME),
      ],
      [
        new ArrayMockClient([], 0, EXEC_TIME * 2),
        new ArrayMockClient(["D", "B", "C"], 1, EXEC_TIME),
        new ArrayMockClient(["E", "B", "C"], 2, 3 * EXEC_TIME),
      ],
      [
        new ArrayMockClient([], 0, EXEC_TIME),
        new ArrayMockClient(["D", "B", "C"], 1, 2 * EXEC_TIME),
        new ArrayMockClient(["E", "B", "C"], 2, 3 * EXEC_TIME),
      ],
      [
        new ArrayMockClient(ABC, 0, EXEC_TIME * 2),
        new ArrayMockClient(["D", "B", "C"], 1, EXEC_TIME, true),
        new ArrayMockClient(["E", "B", "C"], 2, 3 * EXEC_TIME),
      ],
      [
        new ArrayMockClient(ABC, 0, EXEC_TIME * 2),
        new ArrayMockClient([], 1, 1.5 * EXEC_TIME, true),
        new ArrayMockClient([], 2, EXEC_TIME, true),
        new ArrayMockClient(["E", "B", "C"], 3, 3 * EXEC_TIME),
      ],
      [
        new ArrayMockClient(ABC, 0, EXEC_TIME * 2),
        new ArrayMockClient([], 1, EXEC_TIME, true),
        new ArrayMockClient([], 2, 1.5 * EXEC_TIME),
        new ArrayMockClient(["E", "B", "C"], 3, 3 * EXEC_TIME),
      ],
    ]) {
      const sut = makeSut(instances, config, {
        ...DEFAULT_CONFIG,
        multiAgreementShouldResolveUnagreedToUndefined: true,
      });

      const result = await sut.someArrayFunction();
      expect(result).toStrictEqual([undefined, "B", "C"]);

      instances.forEach((instance) => {
        expect(instance.calledArgs).toStrictEqual([instance.ident]);
      });
    }
  });

  it("MultiAgreement should throw for unagreed values", async () => {
    const instances = [
      new ArrayMockClient(ABC, 0, EXEC_TIME * 2),
      new ArrayMockClient(["D", "B", undefined], 1, EXEC_TIME),
      new ArrayMockClient(["E", undefined, "C"], 2, 3 * EXEC_TIME),
    ];
    const sut = makeSut(instances, config);

    await expect(sut.someArrayFunction()).rejects.toThrowError(
      "Agreement failed: got max 1 equal result, needed at least 2"
    );
  });

  it("MultiAgreement should throw when all results failed", async () => {
    const instances = [
      new ArrayMockClient([], 0, EXEC_TIME * 2, true),
      new ArrayMockClient([], 1, EXEC_TIME, true),
      new ArrayMockClient([], 2, 3 * EXEC_TIME, true),
    ];
    const sut = makeSut(instances, config);

    await expect(sut.someArrayFunction()).rejects.toThrowError(
      "MultiAgreement failed: got 0 successful results, needed at least 2"
    );
  });

  it("MultiAgreement should throw when all results failed when shouldResolveUnagreedToUndefined is set to true", async () => {
    const instances = [
      new ArrayMockClient([], 0, EXEC_TIME * 2, true),
      new ArrayMockClient([], 1, EXEC_TIME, true),
      new ArrayMockClient([], 2, 3 * EXEC_TIME, true),
    ];
    const sut = makeSut(instances, config, {
      ...DEFAULT_CONFIG,
      multiAgreementShouldResolveUnagreedToUndefined: true,
    });

    await expect(sut.someArrayFunction()).rejects.toThrowError(
      "MultiAgreement failed: got 0 successful results, needed at least 2"
    );
  });

  it("MultiAgreement should throw when too less successful results", async () => {
    const instances = [
      new ArrayMockClient([], 0, EXEC_TIME * 2, true),
      new ArrayMockClient([], 1, EXEC_TIME, true),
      new ArrayMockClient(ABC, 2, 3 * EXEC_TIME),
    ];
    const sut = makeSut(instances, config, {
      ...DEFAULT_CONFIG,
      multiAgreementShouldResolveUnagreedToUndefined: true,
    });

    await expect(sut.someArrayFunction()).rejects.toThrowError(
      "MultiAgreement failed: got 1 successful result, needed at least 2"
    );
  });

  it("MultiAgreement should throw when too less successful results when shouldResolveUnagreedToUndefined is set to true", async () => {
    const instances = [
      new ArrayMockClient([], 0, EXEC_TIME * 2, true),
      new ArrayMockClient([], 1, EXEC_TIME, true),
      new ArrayMockClient(ABC, 2, 3 * EXEC_TIME),
    ];
    const sut = makeSut(instances, config, {
      ...DEFAULT_CONFIG,
      multiAgreementShouldResolveUnagreedToUndefined: true,
    });

    await expect(sut.someArrayFunction()).rejects.toThrowError(
      "MultiAgreement failed: got 1 successful result, needed at least 2"
    );
  });
});
