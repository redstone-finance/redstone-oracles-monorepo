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
      const sanitized = sanitizeValue(obj) as typeof obj;
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
      const sanitized = sanitizeValue(arr) as string[];

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
});
