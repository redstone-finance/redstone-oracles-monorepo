import { type ConsolaInstance } from "consola";
import {
  createSanitizedLogger,
  loggerFactory,
  maskHostname,
  MAX_DEPTH,
  sanitizeValue,
} from "../../src";

const createMockLogger = () => {
  const capturedArgs: unknown[][] = [];
  const mockLogFn = jest.fn((...args: unknown[]) => {
    capturedArgs.push(args);
  });

  const logger = {
    log: mockLogFn,
    info: mockLogFn,
    warn: mockLogFn,
    error: mockLogFn,
    debug: mockLogFn,
  };

  return { logger, capturedArgs, mockLogFn };
};

describe("Logger Sanitization Logic", () => {
  describe("sanitizeValue", () => {
    test("should sanitize HTTPS URLs in strings", () => {
      const url =
        '{"urls":["https://api.example.com/v1/data?key=secret123","http://api.example.com/v1/data?key=backup456"]}';
      const sanitized = sanitizeValue(url);
      expect(sanitized).toBe(
        '{"urls":["https://api.example.com/...t123","http://api.example.com/...p456"]}'
      );
    });

    test("should sanitize HTTPS URLs in strings", () => {
      const url = "API call to https://api.example.com/v1/data?key=secret123";
      const sanitized = sanitizeValue(url);
      expect(sanitized).toBe("API call to https://api.example.com/...t123");
    });

    test("should sanitize HTTP URLs in strings", () => {
      const url = "API call to http://api.example.com/v1/data?key=secret123";
      const sanitized = sanitizeValue(url);
      expect(sanitized).toBe("API call to http://api.example.com/...t123");
    });

    test("should sanitize WSS URLs in strings", () => {
      const url = "API call to wss://api.example.com/v1/data?key=secret123";
      const sanitized = sanitizeValue(url);
      expect(sanitized).toBe("API call to wss://api.example.com/...t123");
    });

    test("should sanitize HTTP URLs in strings without search", () => {
      const url =
        "API call to https://code-knowledge-style.solana-mainnet.quiknode.pro/05d4dab7c08e082805d4dab7c08e0828248fec4c";
      const sanitized = sanitizeValue(url);
      expect(sanitized).toBe(
        "API call to https://code-knowledge-style.solana-mainnet.quiknode.pro/...ec4c"
      );
    });

    test("must not change HTTPS URLs in strings without secret", () => {
      const url = "API call to https://api.testnet.solana.com";
      const sanitized = sanitizeValue(url);
      expect(sanitized).toBe("API call to https://api.testnet.solana.com");
    });

    test("must not change URLs in strings without secret in first item", () => {
      const url =
        '{"urls":["https://api.testnet.solana.com","http://api.example.com/v1/data?key=backup456"]}';
      const sanitized = sanitizeValue(url);
      expect(sanitized).toBe(
        '{"urls":["https://api.testnet.solana.com","http://api.example.com/...p456"]}'
      );
    });

    test("must not change URLs in strings without secret in second item", () => {
      const url =
        '{"urls":["https://api.example.com/v1/data?key=secret123","https://api.testnet.solana.com"]}';
      const sanitized = sanitizeValue(url);
      expect(sanitized).toBe(
        '{"urls":["https://api.example.com/...t123","https://api.testnet.solana.com"]}'
      );
    });

    test("must not change URLs in strings without secret in both items", () => {
      const url = '{"urls":["https://api.example.com","https://api.testnet.solana.com"]}';
      const sanitized = sanitizeValue(url);
      expect(sanitized).toBe(
        '{"urls":["https://api.example.com","https://api.testnet.solana.com"]}'
      );
    });

    test("should sanitize URLs in nested objects", () => {
      const obj = {
        operation: "data-fetch",
        endpoints: {
          https: "https://api1.example.com/v1/data?key=secret123",
          http: "http://api2.example.com/v1/data?key=backup456",
          wss: "wss://socket.example.com/connect?token=websocket789",
        },
      };
      const sanitized = sanitizeValue(obj);
      expect(JSON.stringify(sanitized)).toBe(
        JSON.stringify({
          operation: "data-fetch",
          endpoints: {
            https: "https://api1.example.com/...t123",
            http: "http://api2.example.com/...p456",
            wss: "wss://socket.example.com/...t789",
          },
        })
      );
    });

    test("should sanitize URLs in arrays", () => {
      const arr = [
        "https://api1.example.com/v1/data?key=secret123",
        "http://api2.example.com/v1/data?key=backup456",
        "wss://socket.example.com/connect?token=websocket789",
      ];
      const sanitized = sanitizeValue(arr);
      expect(JSON.stringify(sanitized)).toBe(
        JSON.stringify([
          "https://api1.example.com/...t123",
          "http://api2.example.com/...p456",
          "wss://socket.example.com/...t789",
        ])
      );
    });

    test("should not modify strings without URLs", () => {
      const message = "This is a regular log message without URLs";
      const sanitized = sanitizeValue(message);
      expect(sanitized).toBe(message);
    });

    test("should redact values of apiKey keys", () => {
      const obj = {
        apiKey: "super-secret-api-key-1234",
        dataServiceId: "redstone-primary-prod",
      };
      const sanitized = sanitizeValue(obj);
      expect(sanitized.apiKey).toBe("supe...");
      expect(sanitized.dataServiceId).toBe("redstone-primary-prod");
    });

    test("should redact api keys in nested objects and arrays", () => {
      const requestParams = {
        dataServiceId: "redstone-primary-prod",
        authenticatedGateways: [
          { url: "https://gateway.example.com", apiKey: "secret-api-key-abcd" },
          { url: "https://gateway2.example.com", apiKey: "short" },
        ],
      };
      const sanitized = sanitizeValue(requestParams);
      expect(sanitized.authenticatedGateways[0].apiKey).toBe("secr...");
      expect(sanitized.authenticatedGateways[1].apiKey).toBe("[Redacted]");
      expect(sanitized.authenticatedGateways[0].url).toBe("https://gateway.example.com");
      expect(sanitized.dataServiceId).toBe("redstone-primary-prod");
    });

    test("should redact non-string and short values of apiKey keys", () => {
      const obj = { apiKey: ["key-number-one", "key-number-two"] };
      const sanitized = sanitizeValue(obj);
      expect(sanitized.apiKey).toBe("[Redacted]");
      expect(sanitizeValue({ apiKey: "short" }).apiKey).toBe("[Redacted]");
      expect(sanitizeValue({ apiKey: "16-chars-api-key" }).apiKey).toBe("[Redacted]");
    });

    test("should redact privateKey, telemetryUrl and telemetryAuthorizationToken", () => {
      const config = {
        chainName: "corn",
        privateKey: "0xdeadbeef1234567890abcdef1234567890abcdef1234567890abcdef12345678",
        telemetryUrl: "https://telemetry.internal.example.com/ingest",
        telemetryAuthorizationToken: "secret-telemetry-token-abcdef",
        dataServiceId: "redstone-primary-prod",
      };
      const sanitized = sanitizeValue(config);
      expect(sanitized.privateKey).toBe("0xde...");
      expect(sanitized.telemetryUrl).toBe("http...");
      expect(sanitized.telemetryAuthorizationToken).toBe("secr...");
      expect(sanitized.chainName).toBe("corn");
      expect(sanitized.dataServiceId).toBe("redstone-primary-prod");
    });
  });

  describe("createSanitizedLogger", () => {
    test("should wrap logger methods to sanitize arguments", () => {
      const { logger: mockRawLogger, capturedArgs, mockLogFn } = createMockLogger();

      const sanitizedLogger = createSanitizedLogger(mockRawLogger as unknown as ConsolaInstance);

      const url = "https://example.com/records/token=123456";
      sanitizedLogger.info("Connecting to: ", url);

      expect(mockLogFn).toHaveBeenCalledTimes(1);

      const argsReceived = capturedArgs[0];
      expect(argsReceived.length).toBe(2);
      expect(argsReceived[0]).toBe("Connecting to: ");

      const sanitizedUrlArg = argsReceived[1];
      expect(sanitizedUrlArg).toBe("https://example.com/...3456");
    });

    test("should handle multiple arguments including objects and arrays", () => {
      const { logger: mockRawLogger, capturedArgs, mockLogFn } = createMockLogger();
      const sanitizedLogger = createSanitizedLogger(mockRawLogger as unknown as ConsolaInstance);

      const obj = {
        httpsUrl: "https://api.test.com?token=abcxyz",
        httpUrl: "http://api.test.com?token=abcxyz",
        wssUrl: "wss://socket.test.com?token=abcxyz",
      };
      const arr = [
        "https://backup.net?key=123456",
        "http://backup.net?key=123456",
        "wss://socket.net?key=123456",
      ];

      sanitizedLogger.error("Failed request", obj, arr);

      expect(mockLogFn).toHaveBeenCalledTimes(1);
      const argsReceived = capturedArgs[0];

      expect(argsReceived.length).toBe(3);
      expect(argsReceived[0]).toBe("Failed request");

      const sanitizedObj = argsReceived[1] as {
        httpsUrl: string;
        httpUrl: string;
        wssUrl: string;
      };
      expect(sanitizedObj.httpsUrl).toBe("https://api.test.com/...cxyz");
      expect(sanitizedObj.httpUrl).toBe("http://api.test.com/...cxyz");
      expect(sanitizedObj.wssUrl).toBe("wss://socket.test.com/...cxyz");

      const sanitizedArr = argsReceived[2] as string[];
      expect(sanitizedArr[0]).toBe("https://backup.net/...3456");
      expect(sanitizedArr[1]).toBe("http://backup.net/...3456");
      expect(sanitizedArr[2]).toBe("wss://socket.net/...3456");
    });
  });

  test("should handle circular references in objects and arrays", () => {
    type CircularObject = {
      name: string;
      self?: CircularObject;
      nested: {
        url: string;
        parent?: CircularObject;
      };
    };

    const circularObj: CircularObject = {
      name: "test",
      nested: {
        url: "https://example.com/secret?key=12345",
      },
    };
    circularObj.self = circularObj;
    circularObj.nested.parent = circularObj;

    type CircularArray = [string, { url: string }, ...unknown[]];
    const circularArray: CircularArray = ["first", { url: "https://example.com/token=abcdef" }];
    circularArray.push(circularArray);

    const sanitizedObj = sanitizeValue(circularObj);
    expect(sanitizedObj.self).toBe("[Circular]");
    expect(sanitizedObj.nested.parent).toBe("[Circular]");
    expect(sanitizedObj.nested.url).toBe("https://example.com/...2345");

    const sanitizedArray = sanitizeValue(circularArray);
    expect(sanitizedArray[0]).toBe("first");
    expect(sanitizedArray[1].url).toBe("https://example.com/...cdef");
    expect(sanitizedArray[2]).toBe("[Circular]");
  });

  test("should properly handle copied object references on same level", () => {
    const nestedObj = { x: "x", y: "y" };
    const nestedObjResult = sanitizeValue(nestedObj);
    const obj = { a: nestedObj, b: nestedObj };

    const result = sanitizeValue(obj);
    expect(result).toEqual({ a: nestedObjResult, b: nestedObjResult });
  });

  test("should properly handle copied object in array", () => {
    const nestedArr = [1, 2, 3];
    const nestedArrResult = sanitizeValue(nestedArr);
    const obj = {
      lists: [nestedArr, nestedArr],
    };

    const result = sanitizeValue(obj);
    expect(result).toEqual({ lists: [nestedArrResult, nestedArrResult] });
  });

  test("should handle deeply nested structures with depth limit", () => {
    type DeepNestedObject = {
      nested?: DeepNestedObject | "[Max Depth Reached]";
      url: string;
      value: number;
    };

    const createDeepObject = (depth: number): DeepNestedObject => {
      if (depth === 0) {
        return { url: "https://example.com/secret?key=12345", value: depth };
      }

      return {
        nested: createDeepObject(depth - 1),
        url: `https://example.com/level${depth}?key=secret${depth}`,
        value: depth,
      };
    };

    const DEPTH = MAX_DEPTH + 1;
    const deepObject = createDeepObject(DEPTH);
    const sanitized = sanitizeValue(deepObject);

    const checkDepth = (obj: DeepNestedObject): number => {
      if (obj.nested === "[Max Depth Reached]") {
        return 1;
      }

      return 1 + checkDepth(obj.nested!);
    };

    expect(checkDepth(sanitized)).toBe(DEPTH - 1);
    expect(sanitized.value).toBe(DEPTH);
    expect(sanitized.url).toBe(`https://example.com/...ret${DEPTH}`);

    let current: DeepNestedObject = sanitized;
    for (let i = 0; i < MAX_DEPTH - 1; i++) {
      expect(current.url).toBe(`https://example.com/...ret${DEPTH - i}`);
      expect(current.value).toBe(DEPTH - i);
      expect(current.nested).not.toBe("[Max Depth Reached]");
      if (current.nested && typeof current.nested !== "string") {
        current = current.nested;
      }
    }
    expect(current).toStrictEqual({
      nested: "[Max Depth Reached]",
      url: "https://example.com/...ret2",
      value: 2,
    });
  });

  describe("JSON output", () => {
    let writeSpy: jest.SpyInstance;

    beforeEach(() => {
      writeSpy = jest.spyOn(process.stdout, "write").mockImplementation(() => true);
    });

    afterEach(() => {
      writeSpy.mockRestore();
      delete process.env.REDSTONE_FINANCE_STRICT_JSON_LOGS;
    });

    const logLine = (message: unknown, ...rest: unknown[]): string => {
      loggerFactory("json-output").info(message, ...rest);
      const lines = writeSpy.mock.calls.map(([line]) => String(line));
      expect(lines).toHaveLength(1);

      return lines[0];
    };

    test("leaves quotes unescaped and serialized JSON as a string by default", () => {
      const line = logLine('data={"t":1}', JSON.stringify({ "3Crv": { lower: 0.62 } }));
      expect(line).toContain('"args":["data={"t":1}","{"3Crv":{"lower":0.62}}"]');
    });
  });

  describe("strict JSON output", () => {
    let writeSpy: jest.SpyInstance;

    beforeEach(() => {
      process.env.REDSTONE_FINANCE_STRICT_JSON_LOGS = "true";
      writeSpy = jest.spyOn(process.stdout, "write").mockImplementation(() => true);
    });

    afterEach(() => {
      writeSpy.mockRestore();
      delete process.env.REDSTONE_FINANCE_STRICT_JSON_LOGS;
    });

    const logArgs = (message: unknown, ...rest: unknown[]): unknown[] => {
      loggerFactory("json-output").info(message, ...rest);
      const lines = writeSpy.mock.calls.map(([line]) => String(line));
      expect(lines).toHaveLength(1);

      return (JSON.parse(lines[0]) as { args: unknown[] }).args;
    };

    test("writes valid JSON that keeps quotes, backslashes, newlines, entities and bigints", () => {
      const args = logArgs(
        'Failed to parseEventToPrice data={"t":1}',
        "path C:\\new",
        "line1\nline2",
        "&quot;quoted&quot;",
        10n
      );
      expect(args).toEqual([
        'Failed to parseEventToPrice data={"t":1}',
        "path C:\\new",
        "line1\nline2",
        "&quot;quoted&quot;",
        "10",
      ]);
    });

    test("nests serialized JSON arguments as objects", () => {
      const hardLimits = {
        "3Crv": { lower: 0.62, upper: 1.45 },
        wstUSR_FUNDAMENTAL: { lower: 1.1 },
      };
      const deepest = Array.from({ length: MAX_DEPTH - 1 }).reduce<object>(
        (inner) => ({ inner }),
        {}
      );
      const args = logArgs(
        "Hard limits",
        JSON.stringify(hardLimits),
        JSON.stringify([1, "a"]),
        JSON.stringify(deepest)
      );
      expect(args).toEqual(["Hard limits", hardLimits, [1, "a"], deepest]);
    });

    test("keeps serialized JSON as a string when parsing would change it", () => {
      const lossy = '{"amount":12345678901234567890}';
      const formatted = '{ "a": 1 }';
      const invalid = '{"a":';
      const deep = JSON.stringify(
        Array.from({ length: MAX_DEPTH }).reduce<object>((inner) => ({ inner }), {})
      );
      expect(logArgs("Values", lossy, formatted, invalid, deep)).toEqual([
        "Values",
        lossy,
        formatted,
        invalid,
        deep,
      ]);
    });

    test("keeps a serialized JSON first argument as a string", () => {
      const message = JSON.stringify({ message: "not a log object", type: "error" });
      expect(logArgs(message)).toEqual([message]);
    });

    test("masks sensitive keys inside serialized JSON", () => {
      const args = logArgs("Config", JSON.stringify({ apiKey: "super-secret-api-key-1234" }));
      expect(args).toEqual(["Config", { apiKey: "supe..." }]);
    });
  });

  describe("maskHostname", () => {
    test("keeps the last characters of the leftmost label, where providers put keys", () => {
      expect(maskHostname("black-withered-diamond.near-mainnet.quiknode.pro")).toBe(
        "...mond.near-mainnet.quiknode.pro"
      );
      expect(maskHostname("eth82120.allnodes.me")).toBe("...2120.allnodes.me");
    });

    test("keeps a bare domain and an address", () => {
      expect(maskHostname("mevblocker.io")).toBe("mevblocker.io");
      expect(maskHostname("127.0.0.1")).toBe("127.0.0.1");
    });
  });
});
