/**
 * Password Validation Tests
 * Tests for password hashing, verification, and strength validation
 */

import { describe, it, expect } from 'vitest';
import {
  hashPassword,
  verifyPassword,
  constantTimeEqual,
  validatePasswordStrength,
  generateSecurePassword,
  DEFAULT_PASSWORD_REQUIREMENTS,
} from '@/lib/security/password-validation';

describe('Password Validation', () => {
  describe('Password Hashing & Verification', () => {
    it('should hash passwords consistently', async () => {
      const password = 'TestPassword123!@#';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      // Hashes should be different (different salts)
      expect(hash1).not.toBe(hash2);

      // Both should verify correctly
      expect(await verifyPassword(password, hash1)).toBe(true);
      expect(await verifyPassword(password, hash2)).toBe(true);
    });

    it('should reject incorrect passwords', async () => {
      const password = 'TestPassword123!@#';
      const hash = await hashPassword(password);

      expect(await verifyPassword('WrongPassword123!@#', hash)).toBe(false);
      expect(await verifyPassword('TestPassword123!@', hash)).toBe(false);
      expect(await verifyPassword('', hash)).toBe(false);
    });

    it('should handle empty passwords', async () => {
      const hash = await hashPassword('');

      // Empty password should still hash and verify
      expect(await verifyPassword('', hash)).toBe(true);
      expect(await verifyPassword('anypassword', hash)).toBe(false);
    });

    it('should handle very long passwords', async () => {
      const longPassword = 'a'.repeat(500);
      const hash = await hashPassword(longPassword);

      expect(await verifyPassword(longPassword, hash)).toBe(true);
      expect(await verifyPassword('a'.repeat(499), hash)).toBe(false);
    });

    it('should handle special characters in passwords', async () => {
      const password = 'P@$$w0rd!#%&*()_+-=[]{}|:;<>?,.~/`';
      const hash = await hashPassword(password);

      expect(await verifyPassword(password, hash)).toBe(true);
      expect(await verifyPassword('P@$$w0rd!#%&*()_+-=[]{}|:;<>?,./`', hash)).toBe(false);
    });

    it('should handle invalid hash format', async () => {
      // Missing colon separator
      expect(await verifyPassword('password', 'invalidenthash')).toBe(false);

      // Invalid hex
      expect(await verifyPassword('password', 'invalid:hash')).toBe(false);

      // Empty hash
      expect(await verifyPassword('password', '')).toBe(false);
    });
  });

  describe('Constant-Time Comparison', () => {
    it('should return true for matching strings', () => {
      expect(constantTimeEqual('secret', 'secret')).toBe(true);
    });

    it('should return false for non-matching strings', () => {
      expect(constantTimeEqual('secret', 'Secret')).toBe(false);
      expect(constantTimeEqual('secret', 'secret2')).toBe(false);
    });

    it('should return false for different length strings', () => {
      expect(constantTimeEqual('secret', 'secrets')).toBe(false);
      expect(constantTimeEqual('secret', 'secre')).toBe(false);
    });

    it('should handle empty strings', () => {
      expect(constantTimeEqual('', '')).toBe(true);
      expect(constantTimeEqual('secret', '')).toBe(false);
      expect(constantTimeEqual('', 'secret')).toBe(false);
    });
  });

  describe('Password Strength Validation', () => {
    it('should validate strong passwords', () => {
      const password = 'StrongPass123!@#';
      const result = validatePasswordStrength(password);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.score).toBeGreaterThan(60);
    });

    it('should reject passwords that are too short', () => {
      const password = 'Short1!';
      const result = validatePasswordStrength(password);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Password must be at least 12 characters long'
      );
    });

    it('should reject passwords without uppercase', () => {
      const password = 'lowercase123!@#';
      const result = validatePasswordStrength(password);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Password must contain at least one uppercase letter'
      );
    });

    it('should reject passwords without lowercase', () => {
      const password = 'UPPERCASE123!@#';
      const result = validatePasswordStrength(password);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Password must contain at least one lowercase letter'
      );
    });

    it('should reject passwords without numbers', () => {
      const password = 'NoNumbers!@#ABC';
      const result = validatePasswordStrength(password);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('should reject passwords without special characters', () => {
      const password = 'NoSpecialChar123';
      const result = validatePasswordStrength(password);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Password must contain at least one special character'
      );
    });

    it('should accept passwords longer than minimum', () => {
      const password = 'VeryLongPasswordWith123!@#Characters';
      const result = validatePasswordStrength(password);

      expect(result.valid).toBe(true);
      expect(result.score).toBe(100); // Bonus for extra length
    });

    it('should support custom requirements', () => {
      const password = 'pass'; // Too short
      const requirements = {
        minLength: 3,
        requireUppercase: false,
        requireLowercase: true,
        requireNumbers: false,
        requireSpecialChars: false,
      };

      const result = validatePasswordStrength(password, requirements);
      expect(result.valid).toBe(true);
    });
  });

  describe('Secure Password Generation', () => {
    it('should generate secure passwords of default length', () => {
      const password = generateSecurePassword();

      expect(password).toHaveLength(16);
      expect(validatePasswordStrength(password).valid).toBe(true);
    });

    it('should generate passwords of custom length', () => {
      const password = generateSecurePassword(20);

      expect(password).toHaveLength(20);
      expect(validatePasswordStrength(password).valid).toBe(true);
    });

    it('should generate different passwords each time', () => {
      const password1 = generateSecurePassword();
      const password2 = generateSecurePassword();
      const password3 = generateSecurePassword();

      expect(password1).not.toBe(password2);
      expect(password2).not.toBe(password3);
    });

    it('should meet all strength requirements', () => {
      const password = generateSecurePassword();
      const result = validatePasswordStrength(password);

      expect(result.valid).toBe(true);
      expect(/[A-Z]/.test(password)).toBe(true); // Has uppercase
      expect(/[a-z]/.test(password)).toBe(true); // Has lowercase
      expect(/[0-9]/.test(password)).toBe(true); // Has number
      expect(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)).toBe(true); // Has special char
    });
  });
});
