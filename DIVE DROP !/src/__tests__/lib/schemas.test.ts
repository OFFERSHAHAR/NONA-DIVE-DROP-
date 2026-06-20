/**
 * Unit tests for Zod schemas
 * Tests validation logic for equipment, damage reports, and user schemas
 */

import { describe, it, expect } from 'vitest';
import {
  equipmentCreateSchema,
  equipmentUpdateSchema,
  equipmentStatusUpdateSchema,
  damageReportCreateSchema,
  damageReportResponseSchema,
  problematicUserCreateSchema,
  blacklistLevelEnum,
  damageTypeEnum,
  equipmentStatusEnum,
  equipmentFilterSchema,
  validateRentalDates,
} from '@/lib/equipment/schemas';
import { registerSchema, loginSchema, completeProfileSchema } from '@/lib/auth/schemas';

describe('Auth Schemas', () => {
  describe('registerSchema', () => {
    it('should validate correct registration input', () => {
      const validInput = {
        email: 'user@example.com',
        password: 'SecurePass123',
        confirmPassword: 'SecurePass123',
        firstName: 'John',
        lastName: 'Doe',
      };

      const result = registerSchema.safeParse(validInput);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('user@example.com');
      }
    });

    it('should reject invalid email', () => {
      const input = {
        email: 'not-an-email',
        password: 'SecurePass123',
        confirmPassword: 'SecurePass123',
        firstName: 'John',
        lastName: 'Doe',
      };

      const result = registerSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject weak passwords', () => {
      const testCases = [
        { password: 'weak', reason: 'too short' },
        { password: 'NoNumbers123', reason: 'all lowercase missing' },
        { password: 'nouppercase123', reason: 'uppercase missing' },
        { password: 'NoNumbers', reason: 'numbers missing' },
      ];

      testCases.forEach(({ password }) => {
        const input = {
          email: 'user@example.com',
          password,
          confirmPassword: password,
          firstName: 'John',
          lastName: 'Doe',
        };

        const result = registerSchema.safeParse(input);
        expect(result.success).toBe(false);
      });
    });

    it('should reject short names', () => {
      const input = {
        email: 'user@example.com',
        password: 'SecurePass123',
        confirmPassword: 'SecurePass123',
        firstName: 'J',
        lastName: 'D',
      };

      const result = registerSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('loginSchema', () => {
    it('should validate correct login input', () => {
      const validInput = {
        email: 'user@example.com',
        password: 'SecurePass123',
      };

      const result = loginSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email format', () => {
      const input = {
        email: 'invalid-email',
        password: 'password',
      };

      const result = loginSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should require password', () => {
      const input = {
        email: 'user@example.com',
        password: '',
      };

      const result = loginSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('completeProfileSchema', () => {
    it('should validate complete profile input', () => {
      const validInput = {
        firstName: 'John',
        lastName: 'Doe',
        divingExperience: 'intermediate' as const,
        bio: 'I love diving',
        location: 'Israel',
      };

      const result = completeProfileSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should accept minimal profile input', () => {
      const input = {
        firstName: 'John',
        lastName: 'Doe',
        divingExperience: 'beginner' as const,
      };

      const result = completeProfileSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject invalid experience level', () => {
      const input = {
        firstName: 'John',
        lastName: 'Doe',
        divingExperience: 'invalid_level',
      };

      const result = completeProfileSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should enforce bio length limit', () => {
      const input = {
        firstName: 'John',
        lastName: 'Doe',
        divingExperience: 'advanced' as const,
        bio: 'a'.repeat(501),
      };

      const result = completeProfileSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });
});

describe('Equipment Schemas', () => {
  describe('equipmentCreateSchema', () => {
    it('should validate correct equipment creation', () => {
      const validInput = {
        name: 'Dive Tank',
        equipment_type: 'tank',
        brand: 'Scubapro',
        rental_price_per_day: 50,
        condition_rating: 5,
      };

      const result = equipmentCreateSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject equipment with short name', () => {
      const input = {
        name: 'AB',
        equipment_type: 'tank',
        rental_price_per_day: 50,
      };

      const result = equipmentCreateSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject negative prices', () => {
      const input = {
        name: 'Dive Tank',
        equipment_type: 'tank',
        rental_price_per_day: -50,
      };

      const result = equipmentCreateSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject zero price', () => {
      const input = {
        name: 'Dive Tank',
        equipment_type: 'tank',
        rental_price_per_day: 0,
      };

      const result = equipmentCreateSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should validate condition rating range', () => {
      const testCases = [0, 6, -1, 5.5];

      testCases.forEach((rating) => {
        const input = {
          name: 'Dive Tank',
          equipment_type: 'tank',
          rental_price_per_day: 50,
          condition_rating: rating,
        };

        const result = equipmentCreateSchema.safeParse(input);
        expect(result.success).toBe(false);
      });
    });

    it('should accept valid condition ratings 1-5', () => {
      for (let rating = 1; rating <= 5; rating++) {
        const input = {
          name: 'Dive Tank',
          equipment_type: 'tank',
          rental_price_per_day: 50,
          condition_rating: rating,
        };

        const result = equipmentCreateSchema.safeParse(input);
        expect(result.success).toBe(true);
      }
    });

    it('should validate photo URLs', () => {
      const validInput = {
        name: 'Dive Tank',
        equipment_type: 'tank',
        rental_price_per_day: 50,
        photo_urls: ['https://example.com/photo1.jpg', 'https://example.com/photo2.jpg'],
      };

      const result = equipmentCreateSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject invalid photo URLs', () => {
      const input = {
        name: 'Dive Tank',
        equipment_type: 'tank',
        rental_price_per_day: 50,
        photo_urls: ['not-a-url', 'also-not-url'],
      };

      const result = equipmentCreateSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('equipmentStatusUpdateSchema', () => {
    it('should validate status updates with all fields', () => {
      const input = {
        status: 'damaged' as const,
        reason: 'Impact damage',
        notes: 'Crack in housing',
      };

      const result = equipmentStatusUpdateSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should validate status with only required field', () => {
      const input = {
        status: 'available' as const,
      };

      const result = equipmentStatusUpdateSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject invalid status', () => {
      const input = {
        status: 'invalid_status',
      };

      const result = equipmentStatusUpdateSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('equipmentFilterSchema', () => {
    it('should accept empty filter object', () => {
      const result = equipmentFilterSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should apply default sort order', () => {
      const result = equipmentFilterSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sort_by).toBe('created_at');
        expect(result.data.sort_order).toBe('desc');
      }
    });

    it('should validate filter with all fields', () => {
      const input = {
        status: 'available' as const,
        equipment_type: 'tank',
        condition_rating_min: 3,
        location_name: 'Dead Sea',
        lister_id: '123e4567-e89b-12d3-a456-426614174000',
        sort_by: 'price' as const,
        sort_order: 'asc' as const,
      };

      const result = equipmentFilterSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });
});

describe('Damage Report Schemas', () => {
  describe('damageReportCreateSchema', () => {
    it('should validate complete damage report', () => {
      const input = {
        equipment_id: '123e4567-e89b-12d3-a456-426614174000',
        rental_id: '223e4567-e89b-12d3-a456-426614174000',
        report_role: 'renter' as const,
        damage_type: 'moderate' as const,
        description: 'The equipment has significant scratches and a small leak',
        damage_photos: ['https://example.com/damage1.jpg'],
        repair_cost_estimate: 150,
      };

      const result = damageReportCreateSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject short description', () => {
      const input = {
        equipment_id: '123e4567-e89b-12d3-a456-426614174000',
        report_role: 'renter' as const,
        damage_type: 'minor' as const,
        description: 'Damaged',
      };

      const result = damageReportCreateSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should validate damage type enum', () => {
      const validTypes = ['minor', 'moderate', 'severe'];

      validTypes.forEach((type) => {
        const input = {
          equipment_id: '123e4567-e89b-12d3-a456-426614174000',
          report_role: 'renter' as const,
          damage_type: type,
          description: 'The equipment has some damage to report',
        };

        const result = damageReportCreateSchema.safeParse(input);
        expect(result.success).toBe(true);
      });
    });

    it('should reject negative repair cost', () => {
      const input = {
        equipment_id: '123e4567-e89b-12d3-a456-426614174000',
        report_role: 'lister' as const,
        damage_type: 'severe' as const,
        description: 'Equipment is completely broken and needs replacement',
        repair_cost_estimate: -100,
      };

      const result = damageReportCreateSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('damageReportResponseSchema', () => {
    it('should validate lister response', () => {
      const input = {
        damage_report_id: '123e4567-e89b-12d3-a456-426614174000',
        lister_response: 'We agree with the damage assessment and will cover the repair cost',
        repair_cost_actual: 175,
        status: 'approved' as const,
      };

      const result = damageReportResponseSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject short response', () => {
      const input = {
        damage_report_id: '123e4567-e89b-12d3-a456-426614174000',
        lister_response: 'Disagree',
        status: 'rejected' as const,
      };

      const result = damageReportResponseSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('problematicUserCreateSchema', () => {
    it('should validate problematic user creation', () => {
      const input = {
        user_id: '123e4567-e89b-12d3-a456-426614174000',
        reason: 'equipment_damage' as const,
        related_rental_id: '223e4567-e89b-12d3-a456-426614174000',
        blacklist_level: 'warning' as const,
        description: 'User returned equipment damaged beyond normal wear',
      };

      const result = problematicUserCreateSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should apply default blacklist level', () => {
      const input = {
        user_id: '123e4567-e89b-12d3-a456-426614174000',
        reason: 'non_payment' as const,
        description: 'User failed to complete payment for rental',
      };

      const result = problematicUserCreateSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.blacklist_level).toBe('warning');
      }
    });
  });
});

describe('Utility Functions', () => {
  describe('validateRentalDates', () => {
    const now = new Date();
    const futureDate = new Date(now.getTime() + 86400000); // tomorrow
    const tomorrowAfter = new Date(futureDate.getTime() + 86400000); // day after tomorrow
    const pastDate = new Date(now.getTime() - 86400000); // yesterday

    it('should validate future rental dates', () => {
      const result = validateRentalDates(
        futureDate.toISOString(),
        tomorrowAfter.toISOString()
      );
      expect(result).toBe(true);
    });

    it('should reject past start dates', () => {
      const result = validateRentalDates(pastDate.toISOString(), futureDate.toISOString());
      expect(result).toBe(false);
    });

    it('should reject end date before start date', () => {
      const result = validateRentalDates(
        tomorrowAfter.toISOString(),
        futureDate.toISOString()
      );
      expect(result).toBe(false);
    });

    it('should reject same start and end dates', () => {
      const result = validateRentalDates(futureDate.toISOString(), futureDate.toISOString());
      expect(result).toBe(false);
    });
  });
});

describe('Enum Types', () => {
  describe('equipmentStatusEnum', () => {
    it('should accept valid status values', () => {
      const validStatuses = ['available', 'unavailable', 'missing', 'damaged'];

      validStatuses.forEach((status) => {
        const result = equipmentStatusEnum.safeParse(status);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid status values', () => {
      const result = equipmentStatusEnum.safeParse('broken');
      expect(result.success).toBe(false);
    });
  });

  describe('damageTypeEnum', () => {
    it('should accept minor, moderate, severe', () => {
      ['minor', 'moderate', 'severe'].forEach((type) => {
        const result = damageTypeEnum.safeParse(type);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('blacklistLevelEnum', () => {
    it('should accept valid blacklist levels', () => {
      ['warning', 'restricted', 'banned'].forEach((level) => {
        const result = blacklistLevelEnum.safeParse(level);
        expect(result.success).toBe(true);
      });
    });
  });
});
