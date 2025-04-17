import { Consola } from "consola";
import { createSanitizedLogger, sanitizeValue } from "../../src/logger/index";

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
      const url = "API call to https://api.example.com/v1/data?key=secret123";
      const sanitized = sanitizeValue(url) as string;
      expect(sanitized).not.toContain("secret123");
      expect(sanitized).toBe("API call to https://api.example.com/...t123");
    });

    test("should sanitize HTTP URLs in strings", () => {
      const url = "API call to http://api.example.com/v1/data?key=secret123";
      const sanitized = sanitizeValue(url) as string;
      expect(sanitized).not.toContain("secret123");
      expect(sanitized).toBe("API call to http://api.example.com/...t123");
    });

    test("should sanitize WSS URLs in strings", () => {
      const url = "API call to wss://api.example.com/v1/data?key=secret123";
      const sanitized = sanitizeValue(url) as string;
      expect(sanitized).not.toContain("secret123");
      expect(sanitized).toBe("API call to wss://api.example.com/...t123");
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
      expect(JSON.stringify(sanitized)).not.toContain("secret123");
      expect(JSON.stringify(sanitized)).not.toContain("backup456");
      expect(JSON.stringify(sanitized)).not.toContain("websocket789");
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

      expect(JSON.stringify(sanitized)).not.toContain("secret123");
      expect(JSON.stringify(sanitized)).not.toContain("backup456");
      expect(JSON.stringify(sanitized)).not.toContain("websocket789");
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
  });

  describe("createSanitizedLogger", () => {
    test("should wrap logger methods to sanitize arguments", () => {
      const {
        logger: mockRawLogger,
        capturedArgs,
        mockLogFn,
      } = createMockLogger();

      const sanitizedLogger = createSanitizedLogger(
        mockRawLogger as unknown as Consola
      );

      const url = "https://example.com/records/token=123456";
      sanitizedLogger.info("Connecting to: ", url);

      expect(mockLogFn).toHaveBeenCalledTimes(1);

      const argsReceived = capturedArgs[0];
      expect(argsReceived.length).toBe(2);
      expect(argsReceived[0]).toBe("Connecting to: ");

      const sanitizedUrlArg = argsReceived[1] as string;
      expect(sanitizedUrlArg).not.toContain("123456");
      expect(sanitizedUrlArg).toBe("https://example.com/...3456");
    });

    test("should handle multiple arguments including objects and arrays", () => {
      const {
        logger: mockRawLogger,
        capturedArgs,
        mockLogFn,
      } = createMockLogger();
      const sanitizedLogger = createSanitizedLogger(
        mockRawLogger as unknown as Consola
      );

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
      expect(sanitizedObj.httpsUrl).not.toContain("abcxyz");
      expect(sanitizedObj.httpsUrl).toBe("https://api.test.com/...cxyz");
      expect(sanitizedObj.httpUrl).toBe("http://api.test.com/...cxyz");
      expect(sanitizedObj.wssUrl).toBe("wss://socket.test.com/...cxyz");

      const sanitizedArr = argsReceived[2] as string[];
      expect(sanitizedArr[0]).not.toContain("123456");
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
    const circularArray: CircularArray = [
      "first",
      { url: "https://example.com/token=abcdef" },
    ];
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

  test("should handle deeply nested structures with depth limit", () => {
    type DeepNestedObject = {
      nested?: DeepNestedObject | "[Max Depth Reached]";
      url: string;
    };

    const createDeepObject = (depth: number): DeepNestedObject => {
      if (depth === 0) {
        return { url: "https://example.com/secret?key=12345" };
      }
      return {
        nested: createDeepObject(depth - 1),
        url: `https://example.com/level${depth}?key=secret${depth}`,
      };
    };

    const deepObject = createDeepObject(6);
    const sanitized = sanitizeValue(deepObject);

    const checkDepth = (obj: DeepNestedObject): number => {
      if (obj.nested === "[Max Depth Reached]") return 1;
      return 1 + checkDepth(obj.nested!);
    };

    expect(checkDepth(sanitized)).toBe(5);
    expect(sanitized.url).toBe("https://example.com/...ret6");

    let current: DeepNestedObject = sanitized;
    for (let i = 0; i < 4; i++) {
      expect(current.nested).not.toBe("[Max Depth Reached]");
      if (current.nested && typeof current.nested !== "string") {
        current = current.nested;
      }
    }
    expect(current.nested).toBe("[Max Depth Reached]");
  });
});
