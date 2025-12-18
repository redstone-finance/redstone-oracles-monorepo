import { checkForDuplicateKeys } from "../src/json-utils";

describe("checkForDuplicateKeys", () => {
  test("should throw error for duplicate keys at root level", () => {
    const jsonWithDuplicateKey = `{
      "interval": 1000,
      "priceAggregator": "median",
      "priceAggregator": "lwap",
      "defaultSource": ["defaultSource"],
      "sourceTimeout": 1,
      "deviationCheck": {
        "deviationWithRecentValues": {
          "maxPercent": 1,
          "maxDelayMilliseconds": 1
        }
      },
      "tokens": {}
    }`;
    expect(() => checkForDuplicateKeys(jsonWithDuplicateKey)).toThrowError(
      'Duplicate key "priceAggregator" found in JSON'
    );
  });

  test("should throw error for duplicate keys in token config", () => {
    const jsonWithDuplicateKey = `{
      "interval": 1000,
      "priceAggregator": "median",
      "defaultSource": ["defaultSource"],
      "sourceTimeout": 1,
      "deviationCheck": {
        "deviationWithRecentValues": {
          "maxPercent": 1,
          "maxDelayMilliseconds": 1
        }
      },
      "tokens": {
        "testToken": {
          "source": ["testSource"],
          "source": ["anotherSource"],
          "broadcasters": ["redstone-packages"]
        }
      }
    }`;
    expect(() => checkForDuplicateKeys(jsonWithDuplicateKey)).toThrowError(
      'Duplicate key "source" found in JSON'
    );
  });

  test("should throw error for duplicate keys in nested deviationCheck", () => {
    const jsonWithDuplicateKey = `{
      "interval": 1000,
      "priceAggregator": "median",
      "defaultSource": ["defaultSource"],
      "sourceTimeout": 1,
      "deviationCheck": {
        "deviationWithRecentValues": {
          "maxPercent": 1,
          "maxPercent": 2,
          "maxDelayMilliseconds": 1
        }
      },
      "tokens": {}
    }`;
    expect(() => checkForDuplicateKeys(jsonWithDuplicateKey)).toThrowError(
      'Duplicate key "maxPercent" found in JSON'
    );
  });

  test("should throw error for duplicate token names", () => {
    const jsonWithDuplicateKey = `{
      "interval": 1000,
      "priceAggregator": "median",
      "defaultSource": ["defaultSource"],
      "sourceTimeout": 1,
      "deviationCheck": {
        "deviationWithRecentValues": {
          "maxPercent": 1,
          "maxDelayMilliseconds": 1
        }
      },
      "tokens": {
        "BTC": {
          "source": ["testSource"],
          "broadcasters": ["redstone-packages"]
        },
        "BTC": {
          "source": ["anotherSource"],
          "broadcasters": ["redstone-packages"]
        }
      }
    }`;
    expect(() => checkForDuplicateKeys(jsonWithDuplicateKey)).toThrowError(
      'Duplicate key "BTC" found in JSON'
    );
  });

  test("should throw error for duplicate keys in deeply nested valueCapConfig", () => {
    const jsonWithDuplicateKey = `{
      "interval": 1000,
      "priceAggregator": "median",
      "defaultSource": ["defaultSource"],
      "sourceTimeout": 1,
      "deviationCheck": {
        "deviationWithRecentValues": {
          "maxPercent": 1,
          "maxDelayMilliseconds": 1
        }
      },
      "tokens": {
        "testToken": {
          "source": ["testSource"],
          "broadcasters": ["redstone-packages"],
          "valueCapConfig": {
            "upper": {
              "value": 100,
              "value": 200
            }
          }
        }
      }
    }`;
    expect(() => checkForDuplicateKeys(jsonWithDuplicateKey)).toThrowError(
      'Duplicate key "value" found in JSON'
    );
  });

  test("should not throw error for valid JSON without duplicates", () => {
    const validJson = `{
      "interval": 1000,
      "priceAggregator": "median",
      "defaultSource": ["defaultSource"],
      "sourceTimeout": 1,
      "deviationCheck": {
        "deviationWithRecentValues": {
          "maxPercent": 1,
          "maxDelayMilliseconds": 1
        }
      },
      "tokens": {
        "BTC": {
          "source": ["testSource"],
          "broadcasters": ["redstone-packages"]
        },
        "ETH": {
          "source": ["testSource"],
          "broadcasters": ["redstone-packages"]
        }
      }
    }`;
    expect(() => checkForDuplicateKeys(validJson)).not.toThrow();
  });

  test("should handle escaped quotes in values correctly", () => {
    const jsonWithEscapedQuotes = `{
      "interval": 1000,
      "description": "This is a \\"quoted\\" value",
      "path": "C:\\\\Users\\\\file.json",
      "tokens": {
        "BTC": {
          "source": ["testSource"],
          "comment": "BTC with \\"special\\" chars"
        }
      }
    }`;
    expect(() => checkForDuplicateKeys(jsonWithEscapedQuotes)).not.toThrow();
  });

  test("should handle escaped backslashes in values correctly", () => {
    const jsonWithEscapedBackslashes = `{
      "interval": 1000,
      "path": "C:\\\\Users\\\\Documents\\\\file.json",
      "regex": "\\\\d+",
      "tokens": {
        "BTC": {
          "source": ["testSource"],
          "pattern": "\\\\w+\\\\.json"
        }
      }
    }`;
    expect(() => checkForDuplicateKeys(jsonWithEscapedBackslashes)).not.toThrow();
  });

  test("should detect duplicate keys even with escaped quotes in values", () => {
    const jsonWithDuplicateKey = `{
      "interval": 1000,
      "description": "Value with \\"quotes\\"",
      "description": "Another value",
      "tokens": {}
    }`;
    expect(() => checkForDuplicateKeys(jsonWithDuplicateKey)).toThrowError(
      'Duplicate key "description" found in JSON'
    );
  });

  test("should detect duplicate keys with escaped characters in key names", () => {
    const jsonWithDuplicateKey = `{
      "normalKey": "value1",
      "keyWith\\"Quote": "value2",
      "keyWith\\"Quote": "value3",
      "tokens": {}
    }`;
    expect(() => checkForDuplicateKeys(jsonWithDuplicateKey)).toThrowError(
      'Duplicate key "keyWith\\"Quote" found in JSON'
    );
  });

  test("should handle complex escape sequences in nested objects", () => {
    const complexJson = `{
      "config": {
        "path": "C:\\\\Program\\\\Files\\\\App\\\\config.json",
        "regex": "\\\\{\\\\"key\\\\":\\\\"[^\\\\"]*\\\\"\\\\}",
        "nested": {
          "value": "String with \\"quotes\\" and \\\\backslashes\\\\",
          "pattern": "\\\\d{4}-\\\\d{2}-\\\\d{2}"
        }
      },
      "tokens": {
        "BTC": {
          "comment": "Path: C:\\\\data\\\\btc.json"
        }
      }
    }`;
    expect(() => checkForDuplicateKeys(complexJson)).not.toThrow();
  });
});
