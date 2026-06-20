import { jwtVerify, SignJWT } from 'jose';
import bcryptjs from 'bcryptjs';

/**
 * SECURITY FIX 1: JWT Secret Validation
 * Fail at startup if JWT secret is not defined in environment.
 * This prevents accidental deployment with an insecure fallback secret.
 *
 * The secret is required for both signing and verifying tokens.
 * Always define ADMIN_SESSION_SECRET in production environments.
 */
function getValidatedSecret(): Uint8Array {
  const secret = process.env.ADMIN_SESSION_SECRET;

  if (!secret) {
    throw new Error(
      'CRITICAL: ADMIN_SESSION_SECRET environment variable is not defined. ' +
      'This is required for secure JWT signing and verification. ' +
      'Please set ADMIN_SESSION_SECRET in your environment variables and restart the application.'
    );
  }

  // Validate minimum secret length (32 bytes = 256 bits for HS256)
  if (secret.length < 32) {
    throw new Error(
      'CRITICAL: ADMIN_SESSION_SECRET is too short. ' +
      'Minimum 32 characters (256 bits for HS256) required. ' +
      `Current length: ${secret.length} characters.`
    );
  }

  return new TextEncoder().encode(secret);
}

// Initialize and validate secret at module load time
let SECRET: Uint8Array;
try {
  SECRET = getValidatedSecret();
} catch (error) {
  console.error('Failed to initialize JWT service:', error);
  throw error;
}

export interface AdminToken {
  username: string;
  role: 'super_admin';
  iat: number;
  exp: number;
}

export interface AdminSession {
  username: string;
  role: 'super_admin';
  token: string;
  refreshToken: string;
  expiresAt: number;
  createdAt: number;
}

/**
 * Hash migration utility for existing SHA256 hashes.
 *
 * SECURITY FIX 2: Password Hashing Migration
 * Provides a helper to detect and migrate old SHA256 hashes to bcrypt.
 * Used during authentication to upgrade hashes on successful login.
 *
 * This allows gradual migration without requiring password resets.
 */
export interface HashMigrationResult {
  isOldHash: boolean;
  isBcryptHash: boolean;
  shouldUpgrade: boolean;
}

/**
 * Detect if a hash is the old SHA256 format (64 hex chars)
 * Bcrypt hashes are 60 characters starting with $2a$, $2b$, or $2y$
 */
export function detectHashFormat(hash: string): HashMigrationResult {
  const sha256Pattern = /^[a-f0-9]{64}$/i;
  const bcryptPattern = /^\$2[aby]\$/;

  const isOldHash = sha256Pattern.test(hash);
  const isBcryptHash = bcryptPattern.test(hash);

  return {
    isOldHash,
    isBcryptHash,
    shouldUpgrade: isOldHash && !isBcryptHash,
  };
}

/**
 * SECURITY FIX 2: Bcrypt Password Hashing
 * Replaces insecure SHA256 hashing with bcryptjs.
 * Bcrypt uses salting and key stretching with configurable work factor.
 *
 * @param password Plain text password to hash
 * @returns Promise<string> Bcrypt hash (60 characters)
 *
 * Cost factor of 12 provides good security vs performance balance.
 * Each increment doubles the computation time:
 * - Cost 10: ~100ms
 * - Cost 12: ~250ms (recommended)
 * - Cost 14: ~1000ms (very secure, slower)
 */
export async function hashPassword(password: string): Promise<string> {
  if (!password || password.length === 0) {
    throw new Error('Password cannot be empty');
  }

  try {
    const salt = await bcryptjs.genSalt(12);
    const hash = await bcryptjs.hash(password, salt);
    return hash;
  } catch (error) {
    console.error('Password hashing failed:', error);
    throw new Error('Failed to hash password');
  }
}

/**
 * SECURITY FIX 2: Bcrypt Password Verification
 * Verifies plaintext password against bcrypt hash.
 * Handles both new bcrypt hashes and legacy SHA256 hashes for migration.
 *
 * @param password Plain text password to verify
 * @param hash Stored hash (either bcrypt or legacy SHA256)
 * @returns Promise<boolean> Whether password matches hash
 */
export async function verifyHashedPassword(password: string, hash: string): Promise<boolean> {
  if (!password || !hash) {
    return false;
  }

  try {
    // Detect hash format and handle accordingly
    const detection = detectHashFormat(hash);

    if (detection.isBcryptHash) {
      // Modern bcrypt hash - use async verification
      return await bcryptjs.compare(password, hash);
    } else if (detection.isOldHash) {
      // Legacy SHA256 hash - support for backward compatibility
      // This should only be used during migration period
      console.warn('Detected legacy SHA256 hash - password should be upgraded to bcrypt on next opportunity');
      const sha256Hash = require('crypto').createHash('sha256').update(password).digest('hex');
      return sha256Hash === hash;
    }

    // Unknown hash format
    return false;
  } catch (error) {
    console.error('Password verification failed:', error);
    return false;
  }
}

/**
 * Migrate legacy SHA256 hash to bcrypt
 * Use this after successful authentication to upgrade old hashes
 *
 * @param legacySha256Hash The old SHA256 hash stored in database
 * @param plainPassword The plaintext password (from successful auth)
 * @returns Promise<string> New bcrypt hash, or empty string if migration fails
 */
export async function migrateLegacyHash(
  legacySha256Hash: string,
  plainPassword: string
): Promise<string> {
  try {
    const detection = detectHashFormat(legacySha256Hash);

    if (!detection.isOldHash) {
      // Not a legacy hash, no migration needed
      return '';
    }

    // Verify plaintext against legacy hash
    const sha256Hash = require('crypto')
      .createHash('sha256')
      .update(plainPassword)
      .digest('hex');

    if (sha256Hash !== legacySha256Hash) {
      // Password doesn't match legacy hash - this shouldn't happen
      // since caller already verified the password
      console.error('Password does not match legacy hash during migration');
      return '';
    }

    // Hash with bcrypt
    const newHash = await hashPassword(plainPassword);
    console.info('Legacy SHA256 hash successfully migrated to bcrypt');
    return newHash;
  } catch (error) {
    console.error('Failed to migrate legacy hash:', error);
    return '';
  }
}

/**
 * Generate JWT token for admin
 * @param username Admin username
 * @returns Promise<string> Signed JWT token
 */
export async function generateAdminToken(username: string): Promise<string> {
  const tokenExpiryHours = parseInt(process.env.ADMIN_TOKEN_EXPIRY_HOURS || '8', 10);

  const token = await new SignJWT({ username, role: 'super_admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${tokenExpiryHours}h`)
    .sign(SECRET);

  return token;
}

/**
 * Generate refresh token for admin
 * Refresh tokens have longer expiry and can be used to get new access tokens
 *
 * @param username Admin username
 * @returns Promise<string> Signed refresh token
 */
export async function generateAdminRefreshToken(username: string): Promise<string> {
  const refreshTokenExpiryHours = parseInt(
    process.env.ADMIN_REFRESH_TOKEN_EXPIRY_HOURS || '72',
    10
  );

  const token = await new SignJWT({ username, role: 'super_admin', type: 'refresh' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${refreshTokenExpiryHours}h`)
    .sign(SECRET);

  return token;
}

/**
 * Verify and decode JWT token
 * @param token JWT token to verify
 * @returns Promise<AdminToken | null> Token payload if valid, null if invalid
 */
export async function verifyAdminToken(token: string): Promise<AdminToken | null> {
  try {
    const verified = await jwtVerify<AdminToken>(token, SECRET);
    return verified.payload;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

/**
 * SECURITY FIX 1: Validate admin credentials against environment
 * Only compares against configured credentials (no database dependency)
 * Credentials should be stored in environment variables in production
 *
 * @param username Username to verify
 * @param password Password to verify (plaintext)
 * @returns boolean Whether credentials match configured admin accounts
 *
 * TODO: In future versions, migrate to database-backed admin accounts
 * with proper bcrypt hash storage and role-based access control.
 */
export function validateAdminCredentials(username: string, password: string): boolean {
  // Check first admin account
  const admin1 =
    process.env.ADMIN_USERNAME === username &&
    process.env.ADMIN_PASSWORD === password;

  // Check second admin account
  const admin2 =
    process.env.ADMIN_USERNAME_2 === username &&
    process.env.ADMIN_PASSWORD_2 === password;

  return admin1 || admin2;
}

/**
 * Create admin session with new tokens
 * @param username Admin username
 * @returns Promise<AdminSession> Session object with tokens
 */
export async function createAdminSession(username: string): Promise<AdminSession> {
  const token = await generateAdminToken(username);
  const refreshToken = await generateAdminRefreshToken(username);
  const now = Date.now();
  const tokenExpiryHours = parseInt(process.env.ADMIN_TOKEN_EXPIRY_HOURS || '8', 10);
  const expiresAt = now + tokenExpiryHours * 60 * 60 * 1000;

  return {
    username,
    role: 'super_admin',
    token,
    refreshToken,
    expiresAt,
    createdAt: now,
  };
}

/**
 * Refresh admin token using a refresh token
 * @param refreshToken Valid refresh token
 * @returns Promise<AdminSession | null> New session if refresh token is valid
 */
export async function refreshAdminToken(refreshToken: string): Promise<AdminSession | null> {
  try {
    const verified = await jwtVerify<any>(refreshToken, SECRET);

    // Verify this is actually a refresh token (has type field)
    if (verified.payload.type !== 'refresh') {
      console.warn('Attempt to use non-refresh token for refresh');
      return null;
    }

    const username = verified.payload.username;
    return createAdminSession(username);
  } catch (error) {
    console.error('Refresh token verification failed:', error);
    return null;
  }
}
