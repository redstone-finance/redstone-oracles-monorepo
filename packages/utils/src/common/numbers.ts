import { loggerFactory } from "../logger";

const logger = loggerFactory("utils/numbers");

export const safelyConvertAnyValueToNumber = (value: unknown): number => {
  if (["string", "number"].includes(typeof value)) {
    return Number(value);
  } else {
    logger.warn(`Value can not be converted to a valid number. Received: ${String(value)}`);

    return NaN;
  }
};

export const clamp = (min: number, value: number, max: number): number =>
  Math.min(Math.max(value, min), max);
