/**
 * Input Validation & Sanitization Module
 * Implements OWASP input validation patterns
 *
 * Features:
 * - HTML entity escaping
 * - URL parameter validation
 * - Email normalization
 * - File name sanitization
 * - SQL injection prevention (parameterized queries)
 * - XSS prevention
 */

import { z } from 'zod';

/**
 * Escape HTML entities
 * Prevents XSS when displaying user-provided content
 */
export function escapeHTML(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Escape HTML (server-side, no DOM)
 */
export function escapeHTMLServer(text: string): string {
  const escapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;',
  };

  return text.replace(/[&<>"'/]/g, char => escapeMap[char]);
}

/**
 * Sanitize URL path parameter
 * Prevents path traversal attacks
 */
export function sanitizePath(path: string): string {
  // Remove null bytes
  let sanitized = path.replace(/\0/g, '');

  // Remove path traversal attempts
  sanitized = sanitized.replace(/\.\.\//g, '');
  sanitized = sanitized.replace(/\.\.%2f/gi, '');
  sanitized = sanitized.replace(/\.\.%5c/gi, '');

  // Remove leading slashes (relative paths)
  sanitized = sanitized.replace(/^\/+/, '');

  return sanitized;
}

/**
 * Sanitize file name
 * Prevents directory traversal and dangerous characters
 */
export function sanitizeFileName(fileName: string): string {
  // Remove path separators
  let sanitized = fileName.replace(/\//g, '_').replace(/\\/g, '_');

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');

  // Remove directory traversal attempts
  sanitized = sanitized.replace(/\.\./g, '');

  // Keep only safe characters: alphanumeric, dash, underscore, dot
  sanitized = sanitized.replace(/[^a-zA-Z0-9._-]/g, '_');

  // Remove leading dots (hidden files)
  sanitized = sanitized.replace(/^\.+/, '');

  // Limit length
  if (sanitized.length > 255) {
    const lastDot = sanitized.lastIndexOf('.');
    if (lastDot > 200) {
      sanitized = sanitized.substring(0, 200) + sanitized.substring(lastDot);
    } else {
      sanitized = sanitized.substring(0, 255);
    }
  }

  return sanitized;
}

/**
 * Normalize email address
 */
export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Validate URL (must be HTTPS in production)
 */
export function isValidURL(url: string, requireHTTPS: boolean = true): boolean {
  try {
    const urlObj = new URL(url);

    if (requireHTTPS && process.env.NODE_ENV === 'production') {
      if (urlObj.protocol !== 'https:') {
        return false;
      }
    }

    // Whitelist allowed domains
    const allowedDomains = [
      'dive-drop.com',
      'supabase.co',
      'vercel.com',
      'cdn.vercel.com',
    ];

    const isAllowed = allowedDomains.some(domain => urlObj.hostname.endsWith(domain));

    return isAllowed;
  } catch {
    return false;
  }
}

/**
 * Sanitize search/filter text
 * Removes special characters that could cause SQL injection or XSS
 */
export function sanitizeSearchText(text: string, maxLength: number = 255): string {
  if (!text) return '';

  // Trim whitespace
  let sanitized = text.trim();

  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  // Remove dangerous characters for SQL
  sanitized = sanitized.replace(/[;'"\-\-]/g, '');

  // Remove HTML tags
  sanitized = sanitized.replace(/<[^>]*>/g, '');

  return sanitized;
}

/**
 * Enhanced Zod schemas with sanitization
 */

// Email schema with normalization
export const emailSchema = z
  .string()
  .email('Invalid email address')
  .max(255)
  .transform(normalizeEmail);

// Password schema with strength requirements
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be less than 128 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>?]/, 'Password must contain at least one special character');

// URL schema with validation
export const urlSchema = z
  .string()
  .url('Invalid URL')
  .refine(url => isValidURL(url), 'URL domain not allowed');

// Sanitized text schema
export const sanitizedTextSchema = z
  .string()
  .max(1000)
  .transform(text => sanitizeSearchText(text, 1000));

// File name schema
export const fileNameSchema = z
  .string()
  .min(1, 'File name required')
  .max(255, 'File name too long')
  .transform(sanitizeFileName)
  .refine(name => name.length > 0, 'File name must contain valid characters');

// Admin/moderator action schema with sanitization
export const adminActionSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  action: z.enum([
    'approve',
    'reject',
    'ban',
    'unban',
    'suspend',
    'warn',
    'delete',
    'restore',
  ]),
  reason: z.string().max(500).transform(text => sanitizeSearchText(text, 500)).optional(),
  duration: z.number().int().positive('Duration must be positive').optional(),
});

/**
 * Validate and sanitize user-provided data
 */
export async function validateAndSanitize<T>(
  schema: z.ZodSchema,
  data: unknown
): Promise<{ valid: boolean; data?: T; errors?: Record<string, string> }> {
  const result = await schema.safeParseAsync(data);

  if (result.success) {
    return {
      valid: true,
      data: result.data as T,
    };
  }

  // Build error map
  const errors: Record<string, string> = {};
  result.error.issues.forEach(issue => {
    const path = issue.path.join('.');
    errors[path] = issue.message;
  });

  return {
    valid: false,
    errors,
  };
}

/**
 * Detect potential XSS attempts
 */
export function containsXSSPayload(text: string): boolean {
  const xssPatterns = [
    /<script[^>]*>/gi,
    /on\w+\s*=/gi, // Event handlers like onclick=
    /javascript:/gi,
    /vbscript:/gi,
    /data:text\/html/gi,
    /eval\(/gi,
    /expression\(/gi,
  ];

  return xssPatterns.some(pattern => pattern.test(text));
}

/**
 * Detect potential SQL injection attempts
 */
export function containsSQLInjectionPayload(text: string): boolean {
  const sqlPatterns = [
    /(\b(UNION|SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|SCRIPT|JAVASCRIPT)\b)/gi,
    /(['";])|(-{2})|({1})/,
    /(xp_|sp_)/gi,
  ];

  return sqlPatterns.some(pattern => pattern.test(text));
}

/**
 * Comprehensive input validation
 */
export function validateInputSecurity(input: string, fieldType: string = 'text'): {
  safe: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  if (input.length > 10000) {
    issues.push('Input exceeds maximum length');
  }

  if (containsXSSPayload(input)) {
    issues.push('Input contains potential XSS payload');
  }

  if (containsSQLInjectionPayload(input)) {
    issues.push('Input contains potential SQL injection payload');
  }

  // Field-specific validation
  if (fieldType === 'email') {
    try {
      new URL(`mailto:${input}`);
    } catch {
      issues.push('Invalid email format');
    }
  }

  if (fieldType === 'url') {
    if (!isValidURL(input)) {
      issues.push('Invalid or disallowed URL');
    }
  }

  return {
    safe: issues.length === 0,
    issues,
  };
}
