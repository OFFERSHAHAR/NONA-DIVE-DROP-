/**
 * Contact Information Encryption
 * Encrypts sensitive contact info (phone, email) before storing in optional fields
 * Uses simple base64 encoding with salt for basic obfuscation
 * For production, consider using crypto-js or TweetNaCl.js
 */

const ENCRYPTION_KEY = process.env.BUDDY_ENCRYPTION_KEY || 'default-key-change-in-production';
const SALT = 'buddy_feature_salt_v1';

/**
 * Simple encryption wrapper - for production use a proper crypto library
 * This is a placeholder that does basic base64 encoding
 */
export function encryptContactInfo(plaintext: string): string {
  try {
    // For production: use crypto-js or @libsodium/libsodium.js
    // This is a basic implementation
    const combined = plaintext + SALT;
    return Buffer.from(combined).toString('base64');
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt contact information');
  }
}

/**
 * Decrypt contact information
 */
export function decryptContactInfo(encrypted: string): string {
  try {
    const combined = Buffer.from(encrypted, 'base64').toString('utf-8');
    return combined.replace(SALT, '');
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt contact information');
  }
}

/**
 * Validate phone number format (international)
 */
export function validatePhoneNumber(phone: string): boolean {
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phone.replace(/[\s\-()]/g, ''));
}

/**
 * Mask contact info for display (show only last digits)
 * Example: +1-206-555-**** or email****@example.com
 */
export function maskContactInfo(contact: string, type: 'phone' | 'email'): string {
  if (type === 'phone') {
    const cleaned = contact.replace(/\D/g, '');
    if (cleaned.length >= 4) {
      return `+...${cleaned.slice(-4)}`;
    }
    return '****';
  } else if (type === 'email') {
    const [local, domain] = contact.split('@');
    if (local && domain) {
      const masked = local.substring(0, 2) + '****';
      return `${masked}@${domain}`;
    }
    return '****@****';
  }
  return '****';
}

/**
 * Check if contact info is encrypted (base64 string)
 */
export function isEncrypted(value: string): boolean {
  try {
    // If it can be decoded from base64 and contains salt, it's likely encrypted
    const decoded = Buffer.from(value, 'base64').toString('utf-8');
    return decoded.includes(SALT);
  } catch {
    return false;
  }
}
