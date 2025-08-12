import { getPolishHolidays } from "../../src/common";

test("should properly return Eastern & Corpus Christi day dates", () => {
  const holidays = getPolishHolidays(2025);

  expect(holidays).toContain("2025-04-20");
  expect(holidays).toContain("2025-04-21");
  expect(holidays).toContain("2025-06-19");
});
