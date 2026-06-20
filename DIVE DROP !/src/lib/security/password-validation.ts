/**
 * Password Validation and Hashing
 * Implements secure password handling with:
 * - Constant-time comparison to prevent timing attacks
 * - PBKDF2 hashing (more secure than SHA256)
 * - Password strength validation
 * - Safe comparison using crypto.timingSafeEqual
 */

import crypto from 'crypto';

/**
 * Configuration for password hashing
 */
export const PASSWORD_CONFIG = {
  // PBKDF2 iterations (higher = slower, more secure against brute force)
  iterations: 100000,
  // Key length in bytes
  keyLength: 64,
  // Digest algorithm
  digest: 'sha512',
  // Salt length in bytes
  saltLength: 32,
};

/**
 * Password strength requirements
 */
export interface PasswordStrengthRequirements {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
}

export const DEFAULT_PASSWORD_REQUIREMENTS: PasswordStrengthRequirements = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
};

/**
 * Hash a password using PBKDF2
 * Returns: salt:hash (hex:hex)
 *
 * IMPORTANT: Takes time proportional to iterations count
 * Use constant salt length to prevent timing attacks
 */
export async function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // Generate random salt
    const salt = crypto.randomBytes(PASSWORD_CONFIG.saltLength);

    // PBKDF2 hash
    crypto.pbkdf2(
      password,
      salt,
      PASSWORD_CONFIG.iterations,
      PASSWORD_CONFIG.keyLength,
      PASSWORD_CONFIG.digest,
      (err, derivedKey) => {
        if (err) {
          reject(err);
        } else {
          // Return salt:derivedKey (for storage)
          const hash = salt.toString('hex') + ':' + derivedKey.toString('hex');
          resolve(hash);
        }
      }
    );
  });
}

/**
 * Verify a password against a stored hash
 * Uses constant-time comparison to prevent timing attacks
 *
 * @param password - The plaintext password to verify
 * @param storedHash - The stored hash in format: salt:hash
 * @returns Promise<boolean> - true if password matches, false otherwise
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    // Parse stored hash
    const [saltHex, storedKeyHex] = storedHash.split(':');

    if (!saltHex || !storedKeyHex) {
      console.error('[PASSWORD] Invalid hash format');
      return false;
    }

    const salt = Buffer.from(saltHex, 'hex');
    const storedKey = Buffer.from(storedKeyHex, 'hex');

    // Derive key from provided password using same salt and parameters
    const derivedKey = await new Promise<Buffer>((resolve, reject) => {
      crypto.pbkdf2(
        password,
        salt,
        PASSWORD_CONFIG.iterations,
        PASSWORD_CONFIG.keyLength,
        PASSWORD_CONFIG.digest,
        (err, dk) => {
          if (err) reject(err);
          else resolve(dk);
        }
      );
    });

    // CRITICAL: Use constant-time comparison
    // Prevents timing attacks that reveal password information
    // crypto.timingSafeEqual throws if lengths don't match
    try {
      return crypto.timingSafeEqual(derivedKey, storedKey);
    } catch {
      // Lengths don't match - password is wrong
      return false;
    }
  } catch (error) {
    console.error('[PASSWORD] Verification error:', error);
    return false;
  }
}

/**
 * Compare two strings using constant-time comparison
 * Prevents timing attacks
 *
 * @param a - First string
 * @param b - Second string
 * @returns true if strings match, false otherwise
 */
export function constantTimeEqual(a: string, b: string): boolean {
  try {
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    // Lengths don't match
    return false;
  }
}

/**
 * Validate password strength
 */
export function validatePasswordStrength(
  password: string,
  requirements: PasswordStrengthRequirements = DEFAULT_PASSWORD_REQUIREMENTS
): {
  valid: boolean;
  errors: string[];
  score: number; // 0-100
} {
  const errors: string[] = [];
  let score = 0;

  // Check length
  if (password.length < requirements.minLength) {
    errors.push(`Password must be at least ${requirements.minLength} characters long`);
  } else {
    score += 25;
  }

  // Check uppercase
  if (requirements.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  } else if (/[A-Z]/.test(password)) {
    score += 20;
  }

  // Check lowercase
  if (requirements.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  } else if (/[a-z]/.test(password)) {
    score += 20;
  }

  // Check numbers
  if (requirements.requireNumbers && !/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  } else if (/[0-9]/.test(password)) {
    score += 15;
  }

  // Check special characters
  if (requirements.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  } else if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    score += 20;
  }

  // Bonus for length beyond minimum
  if (password.length >= requirements.minLength + 8) {
    score = Math.min(100, score + 10);
  }

  return {
    valid: errors.length === 0,
    errors,
    score: Math.min(100, score),
  };
}

/**
 * Generate a secure random password (for temporary passwords, etc.)
 */
export function generateSecurePassword(length: number = 16): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%^&*()_+-=[]{}|:;<>?,./';

  let password = '';

  // Ensure at least one of each required type
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];

  // Fill the rest with random characters
  const allChars = uppercase + lowercase + numbers + special;
  const randomBytes = crypto.getRandomValues(new Uint8Array(length - 4));

  for (let i = 0; i < randomBytes.length; i++) {
    password += allChars[randomBytes[i] % allChars.length];
  }

  // Shuffle password to avoid predictable pattern
  return password
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('');
}

/**
 * Hash password synchronously (for environments where async isn't available)
 * WARNING: This blocks the event loop - use hashPassword() instead when possible
 */
export function hashPasswordSync(password: string): string {
  const salt = crypto.randomBytes(PASSWORD_CONFIG.saltLength);
  const derivedKey = crypto.pbkdf2Sync(
    password,
    salt,
    PASSWORD_CONFIG.iterations,
    PASSWORD_CONFIG.keyLength,
    PASSWORD_CONFIG.digest
  );

  return salt.toString('hex') + ':' + derivedKey.toString('hex');
}

/**
 * Verify password synchronously
 * WARNING: This blocks the event loop - use verifyPassword() instead when possible
 */
export function verifyPasswordSync(password: string, storedHash: string): boolean {
  try {
    const [saltHex, storedKeyHex] = storedHash.split(':');

    if (!saltHex || !storedKeyHex) {
      return false;
    }

    const salt = Buffer.from(saltHex, 'hex');
    const storedKey = Buffer.from(storedKeyHex, 'hex');

    const derivedKey = crypto.pbkdf2Sync(
      password,
      salt,
      PASSWORD_CONFIG.iterations,
      PASSWORD_CONFIG.keyLength,
      PASSWORD_CONFIG.digest
    );

    try {
      return crypto.timingSafeEqual(derivedKey, storedKey);
    } catch {
      return false;
    }
  } catch {
    return false;
  }
}
