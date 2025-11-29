import { describe, it, expect } from 'vitest';
import { getWeekNumber, getWeekBounds, isDateInWeek } from './weekCalculations';

describe('Week Calculation Utilities', () => {
  describe('getWeekNumber', () => {
    it('should return week 1 for the first Thursday of the year', () => {
      // 2024: Jan 4 is Thursday (first Thursday)
      const date = new Date(2024, 0, 4);
      const result = getWeekNumber(date);
      expect(result.weekNumber).toBe(1);
      expect(result.year).toBe(2024);
    });

    it('should handle Monday/Sunday transitions correctly', () => {
      // Test a Monday
      const monday = new Date(2024, 0, 8); // Week 2 Monday
      const mondayResult = getWeekNumber(monday);
      expect(mondayResult.weekNumber).toBe(2);
      
      // Test the previous Sunday (should be week 1)
      const sunday = new Date(2024, 0, 7); // Week 1 Sunday
      const sundayResult = getWeekNumber(sunday);
      expect(sundayResult.weekNumber).toBe(1);
    });

    it('should handle year boundaries correctly - week 52 to week 1', () => {
      // Dec 31, 2023 is Sunday of week 52
      const endOf2023 = new Date(2023, 11, 31);
      const result2023 = getWeekNumber(endOf2023);
      expect(result2023.weekNumber).toBe(52);
      expect(result2023.year).toBe(2023);
      
      // Jan 1, 2024 is Monday of week 1
      const startOf2024 = new Date(2024, 0, 1);
      const result2024 = getWeekNumber(startOf2024);
      expect(result2024.weekNumber).toBe(1);
      expect(result2024.year).toBe(2024);
    });

    it('should handle dates in late December that belong to next year week 1', () => {
      // Dec 30, 2024 is Monday - this should be week 1 of 2025
      const date = new Date(2024, 11, 30);
      const result = getWeekNumber(date);
      expect(result.weekNumber).toBe(1);
      expect(result.year).toBe(2025);
    });

    it('should handle dates in early January that belong to previous year', () => {
      // Jan 1, 2023 is Sunday - this should be week 52 of 2022
      const date = new Date(2023, 0, 1);
      const result = getWeekNumber(date);
      expect(result.weekNumber).toBe(52);
      expect(result.year).toBe(2022);
    });

    it('should apply first Thursday rule correctly', () => {
      // 2021: Jan 4 is Monday, first Thursday is Jan 7
      // Jan 1-3 should be week 53 of 2020
      const jan1_2021 = new Date(2021, 0, 1);
      const result1 = getWeekNumber(jan1_2021);
      expect(result1.year).toBe(2020);
      expect(result1.weekNumber).toBe(53);
      
      // Jan 4 (Monday of week with first Thursday) should be week 1 of 2021
      const jan4_2021 = new Date(2021, 0, 4);
      const result2 = getWeekNumber(jan4_2021);
      expect(result2.weekNumber).toBe(1);
      expect(result2.year).toBe(2021);
    });
  });

  describe('getWeekBounds', () => {
    it('should return Monday to Sunday for week 1', () => {
      const bounds = getWeekBounds(1, 2024);
      
      // Week 1 of 2024 starts on Jan 1 (Monday)
      expect(bounds.startDate.getDay()).toBe(1); // Monday
      expect(bounds.endDate.getDay()).toBe(0); // Sunday
      
      // Should be 6 days apart
      const diff = bounds.endDate.getTime() - bounds.startDate.getTime();
      expect(diff).toBe(6 * 24 * 60 * 60 * 1000);
    });

    it('should handle week boundaries correctly', () => {
      const week2Bounds = getWeekBounds(2, 2024);
      const week1Bounds = getWeekBounds(1, 2024);
      
      // Week 2 should start the day after week 1 ends
      const expectedStart = new Date(week1Bounds.endDate);
      expectedStart.setDate(expectedStart.getDate() + 1);
      
      expect(week2Bounds.startDate.getDate()).toBe(expectedStart.getDate());
      expect(week2Bounds.startDate.getMonth()).toBe(expectedStart.getMonth());
    });

    it('should handle year boundary weeks correctly', () => {
      // Week 52 of 2023
      const week52 = getWeekBounds(52, 2023);
      expect(week52.startDate.getFullYear()).toBe(2023);
      expect(week52.endDate.getFullYear()).toBe(2023);
      
      // Week 1 of 2024
      const week1 = getWeekBounds(1, 2024);
      expect(week1.startDate.getFullYear()).toBe(2024);
    });

    it('should return consistent bounds for week 53 when it exists', () => {
      // 2020 has 53 weeks
      const bounds = getWeekBounds(53, 2020);
      
      expect(bounds.startDate.getDay()).toBe(1); // Monday
      expect(bounds.endDate.getDay()).toBe(0); // Sunday
      
      // Should be 6 days apart
      const diff = bounds.endDate.getTime() - bounds.startDate.getTime();
      expect(diff).toBe(6 * 24 * 60 * 60 * 1000);
    });
  });

  describe('isDateInWeek', () => {
    it('should return true for dates within the specified week', () => {
      // Jan 4, 2024 is in week 1
      const date = new Date(2024, 0, 4);
      expect(isDateInWeek(date, 1, 2024)).toBe(true);
    });

    it('should return false for dates outside the specified week', () => {
      // Jan 4, 2024 is in week 1, not week 2
      const date = new Date(2024, 0, 4);
      expect(isDateInWeek(date, 2, 2024)).toBe(false);
    });

    it('should handle Monday/Sunday boundaries correctly', () => {
      // Jan 8, 2024 is Monday of week 2
      const monday = new Date(2024, 0, 8);
      expect(isDateInWeek(monday, 2, 2024)).toBe(true);
      expect(isDateInWeek(monday, 1, 2024)).toBe(false);
      
      // Jan 7, 2024 is Sunday of week 1
      const sunday = new Date(2024, 0, 7);
      expect(isDateInWeek(sunday, 1, 2024)).toBe(true);
      expect(isDateInWeek(sunday, 2, 2024)).toBe(false);
    });

    it('should handle year boundary correctly', () => {
      // Dec 31, 2023 is in week 52 of 2023
      const date = new Date(2023, 11, 31);
      expect(isDateInWeek(date, 52, 2023)).toBe(true);
      expect(isDateInWeek(date, 1, 2024)).toBe(false);
    });

    it('should handle dates that belong to different year than calendar year', () => {
      // Jan 1, 2023 is in week 52 of 2022
      const date = new Date(2023, 0, 1);
      expect(isDateInWeek(date, 52, 2022)).toBe(true);
      expect(isDateInWeek(date, 1, 2023)).toBe(false);
    });
  });

  describe('Integration tests', () => {
    it('should have consistent results between getWeekNumber and isDateInWeek', () => {
      const date = new Date(2024, 5, 15); // Random date
      const { weekNumber, year } = getWeekNumber(date);
      
      // The date should be in its own week
      expect(isDateInWeek(date, weekNumber, year)).toBe(true);
    });

    it('should have all dates in week bounds match the week number', () => {
      const { startDate, endDate } = getWeekBounds(10, 2024);
      
      // Check start date
      const startWeek = getWeekNumber(startDate);
      expect(startWeek.weekNumber).toBe(10);
      expect(startWeek.year).toBe(2024);
      
      // Check end date
      const endWeek = getWeekNumber(endDate);
      expect(endWeek.weekNumber).toBe(10);
      expect(endWeek.year).toBe(2024);
      
      // Check middle date
      const middleDate = new Date(startDate);
      middleDate.setDate(middleDate.getDate() + 3);
      const middleWeek = getWeekNumber(middleDate);
      expect(middleWeek.weekNumber).toBe(10);
      expect(middleWeek.year).toBe(2024);
    });
  });

  describe('Edge Cases - Week Boundaries', () => {
    it('should handle Monday at midnight correctly', () => {
      // Jan 8, 2024 at 00:00:00 (Monday of week 2)
      const mondayMidnight = new Date(2024, 0, 8, 0, 0, 0);
      const result = getWeekNumber(mondayMidnight);
      expect(result.weekNumber).toBe(2);
      expect(result.year).toBe(2024);
    });

    it('should handle Sunday at 23:59:59 correctly', () => {
      // Jan 7, 2024 at 23:59:59 (Sunday of week 1)
      const sundayEnd = new Date(2024, 0, 7, 23, 59, 59);
      const result = getWeekNumber(sundayEnd);
      expect(result.weekNumber).toBe(1);
      expect(result.year).toBe(2024);
    });

    it('should handle consecutive days across week boundary', () => {
      // Sunday Jan 7, 2024 (end of week 1)
      const sunday = new Date(2024, 0, 7);
      const sundayResult = getWeekNumber(sunday);
      
      // Monday Jan 8, 2024 (start of week 2)
      const monday = new Date(2024, 0, 8);
      const mondayResult = getWeekNumber(monday);
      
      expect(sundayResult.weekNumber).toBe(1);
      expect(mondayResult.weekNumber).toBe(2);
      expect(mondayResult.weekNumber - sundayResult.weekNumber).toBe(1);
    });
  });

  describe('Edge Cases - Year Boundaries', () => {
    it('should handle Dec 31 to Jan 1 transition when both in different weeks', () => {
      // Dec 31, 2023 (Sunday, week 52 of 2023)
      const dec31 = new Date(2023, 11, 31);
      const dec31Result = getWeekNumber(dec31);
      
      // Jan 1, 2024 (Monday, week 1 of 2024)
      const jan1 = new Date(2024, 0, 1);
      const jan1Result = getWeekNumber(jan1);
      
      expect(dec31Result.weekNumber).toBe(52);
      expect(dec31Result.year).toBe(2023);
      expect(jan1Result.weekNumber).toBe(1);
      expect(jan1Result.year).toBe(2024);
    });

    it('should handle week 53 correctly for years that have it', () => {
      // 2020 has 53 weeks (leap year starting on Wednesday)
      // Dec 28, 2020 is Monday of week 53
      const dec28_2020 = new Date(2020, 11, 28);
      const result = getWeekNumber(dec28_2020);
      expect(result.weekNumber).toBe(53);
      expect(result.year).toBe(2020);
      
      // Jan 3, 2021 is Sunday of week 53 of 2020
      const jan3_2021 = new Date(2021, 0, 3);
      const result2 = getWeekNumber(jan3_2021);
      expect(result2.weekNumber).toBe(53);
      expect(result2.year).toBe(2020);
    });

    it('should handle transition from week 53 to week 1', () => {
      // Jan 3, 2021 (Sunday, week 53 of 2020)
      const lastDayWeek53 = new Date(2021, 0, 3);
      const result1 = getWeekNumber(lastDayWeek53);
      
      // Jan 4, 2021 (Monday, week 1 of 2021)
      const firstDayWeek1 = new Date(2021, 0, 4);
      const result2 = getWeekNumber(firstDayWeek1);
      
      expect(result1.weekNumber).toBe(53);
      expect(result1.year).toBe(2020);
      expect(result2.weekNumber).toBe(1);
      expect(result2.year).toBe(2021);
    });
  });

  describe('Edge Cases - First Thursday Rule', () => {
    it('should handle year where Jan 1 is Thursday (week 1 starts on Monday Dec 29)', () => {
      // 2015: Jan 1 is Thursday
      // Week 1 should start on Dec 29, 2014
      const jan1_2015 = new Date(2015, 0, 1);
      const result = getWeekNumber(jan1_2015);
      expect(result.weekNumber).toBe(1);
      expect(result.year).toBe(2015);
      
      // Dec 29, 2014 (Monday) should also be week 1 of 2015
      const dec29_2014 = new Date(2014, 11, 29);
      const result2 = getWeekNumber(dec29_2014);
      expect(result2.weekNumber).toBe(1);
      expect(result2.year).toBe(2015);
    });

    it('should handle year where Jan 1 is Friday (week 1 starts on Monday Jan 4)', () => {
      // 2016: Jan 1 is Friday
      // First Thursday is Jan 7, so week 1 starts on Monday Jan 4
      const jan1_2016 = new Date(2016, 0, 1);
      const result1 = getWeekNumber(jan1_2016);
      expect(result1.year).toBe(2015); // Belongs to previous year
      
      const jan4_2016 = new Date(2016, 0, 4);
      const result2 = getWeekNumber(jan4_2016);
      expect(result2.weekNumber).toBe(1);
      expect(result2.year).toBe(2016);
    });

    it('should handle year where Jan 1 is Saturday (week 1 starts on Monday Jan 4)', () => {
      // 2022: Jan 1 is Saturday
      // First Thursday is Jan 6, so week 1 starts on Monday Jan 3
      const jan1_2022 = new Date(2022, 0, 1);
      const result1 = getWeekNumber(jan1_2022);
      expect(result1.year).toBe(2021); // Belongs to previous year
      
      const jan3_2022 = new Date(2022, 0, 3);
      const result2 = getWeekNumber(jan3_2022);
      expect(result2.weekNumber).toBe(1);
      expect(result2.year).toBe(2022);
    });

    it('should handle year where Jan 1 is Sunday (week 1 starts on Monday Jan 3)', () => {
      // 2023: Jan 1 is Sunday
      // First Thursday is Jan 5, so week 1 starts on Monday Jan 2
      const jan1_2023 = new Date(2023, 0, 1);
      const result1 = getWeekNumber(jan1_2023);
      expect(result1.year).toBe(2022); // Belongs to previous year
      
      const jan2_2023 = new Date(2023, 0, 2);
      const result2 = getWeekNumber(jan2_2023);
      expect(result2.weekNumber).toBe(1);
      expect(result2.year).toBe(2023);
    });

    it('should handle year where Jan 1 is Monday (week 1 starts on Jan 1)', () => {
      // 2024: Jan 1 is Monday
      // First Thursday is Jan 4, so week 1 starts on Monday Jan 1
      const jan1_2024 = new Date(2024, 0, 1);
      const result = getWeekNumber(jan1_2024);
      expect(result.weekNumber).toBe(1);
      expect(result.year).toBe(2024);
    });
  });
});
