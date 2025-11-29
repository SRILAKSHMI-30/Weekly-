/**
 * ISO 8601 Week Calculation Utilities
 * 
 * ISO 8601 week date system rules:
 * - Weeks start on Monday and end on Sunday
 * - Week 1 is the week containing the first Thursday of the year
 * - Each week belongs to the year that contains the Thursday
 */

/**
 * Get the ISO 8601 week number and year for a given date
 * @param date The date to get the week number for
 * @returns Object containing weekNumber (1-53) and year
 */
export function getWeekNumber(date: Date): { weekNumber: number; year: number } {
  // Create a copy to avoid mutating the input
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  
  // Set to nearest Thursday: current date + 4 - current day number
  // Make Sunday's day number 7
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  
  // Get first day of year
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  
  // Calculate full weeks to nearest Thursday
  const weekNumber = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  
  return {
    weekNumber,
    year: d.getUTCFullYear()
  };
}

/**
 * Get the start and end dates for a given ISO 8601 week
 * @param weekNumber The week number (1-53)
 * @param year The year
 * @returns Object containing startDate (Monday) and endDate (Sunday)
 */
export function getWeekBounds(weekNumber: number, year: number): { startDate: Date; endDate: Date } {
  // Find the first Thursday of the year
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7; // Make Sunday = 7
  
  // Find Monday of week 1 (Thursday - 3 days)
  const week1Monday = new Date(jan4);
  week1Monday.setUTCDate(jan4.getUTCDate() - jan4Day + 1);
  
  // Calculate the Monday of the requested week
  const startDate = new Date(week1Monday);
  startDate.setUTCDate(week1Monday.getUTCDate() + (weekNumber - 1) * 7);
  
  // Calculate the Sunday of the requested week
  const endDate = new Date(startDate);
  endDate.setUTCDate(startDate.getUTCDate() + 6);
  
  // Convert from UTC to local dates
  return {
    startDate: new Date(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate()),
    endDate: new Date(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate())
  };
}

/**
 * Check if a date falls within a specific ISO 8601 week
 * @param date The date to check
 * @param weekNumber The week number (1-53)
 * @param year The year
 * @returns true if the date is in the specified week, false otherwise
 */
export function isDateInWeek(date: Date, weekNumber: number, year: number): boolean {
  const dateWeek = getWeekNumber(date);
  return dateWeek.weekNumber === weekNumber && dateWeek.year === year;
}
