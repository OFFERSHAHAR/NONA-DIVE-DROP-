/**
 * Unit tests for rental utility functions
 * Tests calculations and validation logic for equipment rentals
 */

import { describe, it, expect } from 'vitest';
import {
  calculateRentalDays,
  calculateRentalFinancials,
  validateRentalDates,
} from '@/lib/rentals/commission';

describe('Rental Utilities', () => {
  describe('calculateRentalDays', () => {
    it('should calculate days between two dates correctly', () => {
      const startDate = new Date('2026-06-20');
      const endDate = new Date('2026-06-25');

      const days = calculateRentalDays(startDate, endDate);
      expect(days).toBe(5);
    });

    it('should calculate single day rental', () => {
      const startDate = new Date('2026-06-20');
      const endDate = new Date('2026-06-21');

      const days = calculateRentalDays(startDate, endDate);
      expect(days).toBe(1);
    });

    it('should handle same day start and end', () => {
      const startDate = new Date('2026-06-20');
      const endDate = new Date('2026-06-20');

      const days = calculateRentalDays(startDate, endDate);
      expect(days).toBe(0);
    });

    it('should calculate long duration rentals', () => {
      const startDate = new Date('2026-01-01');
      const endDate = new Date('2026-12-31');

      const days = calculateRentalDays(startDate, endDate);
      expect(days).toBe(365);
    });
  });

  describe('calculateRentalFinancials', () => {
    it('should calculate basic rental cost without extras', () => {
      const financials = calculateRentalFinancials({
        dailyPriceCents: 5000, // 50 ILS
        rentalDays: 5,
        commissionRate: 0.15,
        depositCents: 0,
        insuranceCents: 0,
      });

      expect(financials.subtotalCents).toBe(25000); // 5000 * 5
      expect(financials.totalCostCents).toBe(25000);
      expect(financials.depositCents).toBe(0);
      expect(financials.insuranceCents).toBe(0);
    });

    it('should include insurance costs', () => {
      const financials = calculateRentalFinancials({
        dailyPriceCents: 5000,
        rentalDays: 5,
        commissionRate: 0.15,
        depositCents: 0,
        insuranceCents: 500, // 5 ILS per day
      });

      expect(financials.insuranceCents).toBe(500);
      expect(financials.totalCostCents).toBe(25500);
    });

    it('should include deposit in total cost', () => {
      const financials = calculateRentalFinancials({
        dailyPriceCents: 5000,
        rentalDays: 5,
        commissionRate: 0.15,
        depositCents: 5000,
        insuranceCents: 0,
      });

      expect(financials.depositCents).toBe(5000);
      expect(financials.totalCostCents).toBe(30000); // 25000 + 5000
    });

    it('should calculate commission correctly', () => {
      const financials = calculateRentalFinancials({
        dailyPriceCents: 5000,
        rentalDays: 5,
        commissionRate: 0.15, // 15%
        depositCents: 0,
        insuranceCents: 0,
      });

      const expectedCommission = Math.floor(25000 * 0.15);
      expect(financials.commissionCents).toBe(expectedCommission);
    });

    it('should calculate net to lister correctly', () => {
      const financials = calculateRentalFinancials({
        dailyPriceCents: 5000,
        rentalDays: 5,
        commissionRate: 0.15,
        depositCents: 0,
        insuranceCents: 0,
      });

      const expectedNet = 25000 - financials.commissionCents;
      expect(financials.netToListerCents).toBe(expectedNet);
    });

    it('should handle all costs together', () => {
      const financials = calculateRentalFinancials({
        dailyPriceCents: 10000, // 100 ILS per day
        rentalDays: 7,
        commissionRate: 0.2,
        depositCents: 10000, // 100 ILS deposit
        insuranceCents: 1000, // 10 ILS insurance
      });

      const subtotal = 10000 * 7; // 70000
      const expectedCommission = Math.floor(subtotal * 0.2); // 14000
      const expectedNet = subtotal - expectedCommission; // 56000

      expect(financials.subtotalCents).toBe(70000);
      expect(financials.commissionCents).toBe(expectedCommission);
      expect(financials.netToListerCents).toBe(expectedNet);
      expect(financials.insuranceCents).toBe(1000);
      expect(financials.depositCents).toBe(10000);
      expect(financials.totalCostCents).toBe(71000 + 10000); // subtotal + insurance + deposit
    });

    it('should handle zero commission rate', () => {
      const financials = calculateRentalFinancials({
        dailyPriceCents: 5000,
        rentalDays: 5,
        commissionRate: 0,
        depositCents: 0,
        insuranceCents: 0,
      });

      expect(financials.commissionCents).toBe(0);
      expect(financials.netToListerCents).toBe(25000);
    });

    it('should handle high commission rates', () => {
      const financials = calculateRentalFinancials({
        dailyPriceCents: 5000,
        rentalDays: 5,
        commissionRate: 0.3, // 30%
        depositCents: 0,
        insuranceCents: 0,
      });

      const expectedCommission = Math.floor(25000 * 0.3);
      expect(financials.commissionCents).toBe(expectedCommission);
      expect(financials.netToListerCents).toBe(25000 - expectedCommission);
    });

    it('should maintain cent precision without floating point errors', () => {
      const financials = calculateRentalFinancials({
        dailyPriceCents: 12345,
        rentalDays: 3,
        commissionRate: 0.165,
        depositCents: 5000,
        insuranceCents: 999,
      });

      // All values should be integers
      expect(Number.isInteger(financials.subtotalCents)).toBe(true);
      expect(Number.isInteger(financials.commissionCents)).toBe(true);
      expect(Number.isInteger(financials.netToListerCents)).toBe(true);
      expect(Number.isInteger(financials.totalCostCents)).toBe(true);
    });
  });

  describe('validateRentalDates', () => {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const dayAfterTomorrow = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    it('should accept valid future dates', () => {
      const startDate = tomorrow.toISOString().split('T')[0];
      const endDate = dayAfterTomorrow.toISOString().split('T')[0];

      const result = validateRentalDates(startDate, endDate);
      expect(result).toBe(true);
    });

    it('should reject past start dates', () => {
      const startDate = yesterday.toISOString().split('T')[0];
      const endDate = tomorrow.toISOString().split('T')[0];

      const result = validateRentalDates(startDate, endDate);
      expect(result).toBe(false);
    });

    it('should reject when end date is before start date', () => {
      const startDate = dayAfterTomorrow.toISOString().split('T')[0];
      const endDate = tomorrow.toISOString().split('T')[0];

      const result = validateRentalDates(startDate, endDate);
      expect(result).toBe(false);
    });

    it('should reject same day start and end', () => {
      const startDate = tomorrow.toISOString().split('T')[0];
      const endDate = startDate;

      const result = validateRentalDates(startDate, endDate);
      expect(result).toBe(false);
    });
  });
});
