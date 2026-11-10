import { getPolishHolidays, toWarsawTime } from "../../src/common";

test("should properly return Eastern & Corpus Christi day dates", () => {
  const holidays = getPolishHolidays(2025);

  expect(holidays).toContain("2025-04-20");
  expect(holidays).toContain("2025-04-21");
  expect(holidays).toContain("2025-06-19");
});

describe("toWarsawTime", () => {
  it("returns Warsaw wall-clock time as UTC+1 in winter", () => {
    expect(toWarsawTime(new Date("2026-11-03T10:05:00Z"))).toEqual(new Date("2026-11-03T11:05:00"));
  });

  it("returns Warsaw wall-clock time as UTC+2 in summer", () => {
    expect(toWarsawTime(new Date("2026-07-03T09:05:00Z"))).toEqual(new Date("2026-07-03T11:05:00"));
  });
});
