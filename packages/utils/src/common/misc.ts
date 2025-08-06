import _ from "lodash";

export function roundToSignificantDigits(num: number, number = 2): number {
  if (num === 0) {
    return 0;
  }

  const d = Math.ceil(Math.log10(num < 0 ? -num : num));
  const power = number - d;
  const magnitude = Math.pow(10, power);
  const shifted = Math.round(num * magnitude);

  return shifted / magnitude;
}

export function getFilenameWithoutExtension(url: string) {
  const filenameWithExtension = url.substring(url.lastIndexOf("/") + 1);

  return filenameWithExtension.split(".").slice(0, -1).join(".");
}

export function getS(value: number, s = "s") {
  return value !== 1 ? s : "";
}

export function toOrdinal(n: number): string {
  const lastDigit = n % 10;
  const rem100 = n % 100;

  if (lastDigit === 1 && rem100 !== 11) {
    return `${n}st`;
  } else if (lastDigit === 2 && rem100 !== 12) {
    return `${n}nd`;
  } else if (lastDigit === 3 && rem100 !== 13) {
    return `${n}rd`;
  } else {
    return `${n}th`;
  }
}

export function stringify<R>(result: R) {
  if (typeof result === "string") {
    return result;
  }

  if (result === undefined || result === null) {
    return String(result);
  }

  try {
    if (
      typeof result === "number" ||
      typeof result === "boolean" ||
      typeof result === "bigint" ||
      typeof result === "symbol"
    ) {
      return String(result);
    }

    return unescapeString(JSON.stringify(result));
  } catch (_e) {
    if (
      typeof result.toString === "function" &&
      result.toString !== Object.prototype.toString
    ) {
      return unescapeString(result.toString());
    }

    if (typeof result === "object") {
      try {
        const properties = Object.entries(result).map(([key, value]) => {
          if (typeof value === "object" && value !== null) {
            value = stringify(value);
          } else if (typeof value === "function") {
            value = "[Function]";
          }
          return `${key}: ${value}`;
        });

        return `{${properties.join(", ")}}`;
      } catch {
        return "[Complex Object]";
      }
    }

    return "[Unable to stringify value]";
  }
}

function unescapeString(s: string) {
  return _.unescape(s).replace(/\\"/g, '"').replace(/\\\\/g, "\\");
}
