import { addDays } from "date-fns";

export function getPolishHolidays(year: number): string[] {
  const EASTER_DATES: Record<number, string> = {
    2024: "2024-03-31",
    2025: "2025-04-20",
    2026: "2026-04-05",
    2027: "2027-03-28",
    2028: "2028-04-16",
    2029: "2029-04-01",
    2030: "2030-04-21",
    2031: "2031-04-13",
    2032: "2032-03-28",
    2033: "2033-04-17",
  };

  const holidays = [
    `${year}-01-01`,
    `${year}-01-06`,
    `${year}-05-01`,
    `${year}-05-03`,
    `${year}-08-15`,
    `${year}-11-01`,
    `${year}-11-11`,
    `${year}-12-25`,
    `${year}-12-26`,
  ];

  const easter = EASTER_DATES[year];
  if (easter) {
    holidays.push(easter);
    holidays.push(formatDate(addDays(easter, 1)));
    holidays.push(formatDate(addDays(easter, 60)));
  }

  return holidays;
}

export function isHoliday(date: Date): boolean {
  const holidays = getPolishHolidays(date.getFullYear());
  const dateString = formatDate(date);

  return holidays.includes(dateString);
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function isWithinWorkingHours(): boolean {
  const now = new Date();

  const warsawTimeString = now.toLocaleString("en-US", {
    timeZone: "Europe/Warsaw",
  });

  const warsawDate = new Date(warsawTimeString);

  const hour = warsawDate.getHours(); // 0–23
  const weekday = warsawDate.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

  const isWeekday = weekday >= 1 && weekday <= 5;
  const isWithinHours = hour >= 10 && hour < 22;
  const isItHoliday = isHoliday(warsawDate);

  return isWeekday && isWithinHours && !isItHoliday;
}
