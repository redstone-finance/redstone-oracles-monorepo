import { z } from "zod";

/**
 * Zod modifies data that is parsed.
 * Using this helper prevents modification.
 */
export function zodAssert<O>(schema: z.ZodSchema<O>, data: unknown): asserts data is O {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new Error(`Zod validation error: ${result.error.toString()}`);
  }
}

/**
 * duration format: number[s|m|h|d]
 * s - seconds
 * m - minutes
 * h - hours
 * d - days
 * outputs duration in ms
 */
export const durationToMilliseconds = (duration: string): number => {
  const regex = /^(\d+)([smhd])$/; // matches number + unit (s, m, h, d)
  const match = duration.match(regex);
  if (!match) {
    throw new Error("Invalid duration format");
  }
  const value = parseInt(match[1], 10);
  const unit = match[2];
  switch (unit) {
    case "d":
      return value * 86400000;
    case "h":
      return value * 3600000;
    case "m":
      return value * 60000;
    case "s":
      return value * 1000;
    default:
      throw new Error("Unknown unit");
  }
};

export const durationSchema = z.string().transform((val) => durationToMilliseconds(val));
