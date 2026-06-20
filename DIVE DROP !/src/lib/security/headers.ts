/**
 * Security Headers Module
 * Implements OWASP recommended HTTP security headers
 *
 * Headers:
 * - HSTS: Force HTTPS
 * - X-Content-Type-Options: Prevent MIME sniffing
 * - X-Frame-Options: Prevent clickjacking
 * - X-XSS-Protection: Legacy XSS protection
 * - Referrer-Policy: Control referrer information
 * - Content-Security-Policy: Prevent XSS and injection attacks
 * - Permissions-Policy: Control browser features
 */

import { NextResponse } from 'next/server';

/**
 * Security headers configuration
 */
export const SECURITY_HEADERS: Record<string, string> = {
  // HSTS: Force HTTPS for 1 year, include subdomains
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',

  // Prevent MIME type sniffing (X-Content-Type-Options)
  'X-Content-Type-Options': 'nosniff',

  // Prevent clickjacking attacks
  'X-Frame-Options': 'DENY',

  // Legacy XSS protection (most browsers use CSP)
  'X-XSS-Protection': '1; mode=block',

  // Control referrer information
  'Referrer-Policy': 'strict-origin-when-cross-origin',

  // Permissions Policy (formerly Feature Policy)
  // Disable: geolocation, microphone, camera, payment
  'Permissions-Policy': [
    'geolocation=(self)',
    'microphone=()',
    'camera=()',
    'payment=self',
    'usb=()',
    'vr=()',
    'accelerometer=()',
    'gyroscope=()',
    'magnetometer=()',
  ].join(', '),

  // Additional security headers
  'X-Permitted-Cross-Domain-Policies': 'none',
  'Cross-Origin-Embedder-Policy': 'require-corp',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
};

/**
 * Content Security Policy configuration
 * Varies by page type and environment
 */
export const CSP_CONFIG = {
  // Default for all pages
  default: {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      'https://cdn.vercel.com', // Vercel analytics
      'https://vitals.vercel-analytics.com',
      "'unsafe-inline'", // Only for development
    ],
    'style-src': [
      "'self'",
      "'unsafe-inline'", // Tailwind CSS requires this
      'https://fonts.googleapis.com',
    ],
    'font-src': [
      "'self'",
      'https://fonts.gstatic.com',
      'data:',
    ],
    'img-src': [
      "'self'",
      'https:',
      'data:',
      'blob:',
    ],
    'media-src': ["'self'"],
    'connect-src': [
      "'self'",
      'https://api.dive-drop.com',
      'https://dive-drop.supabase.co',
      'https://vitals.vercel-analytics.com',
      'wss:',
    ],
    'frame-src': ["'none'"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
    'upgrade-insecure-requests': [],
  },

  // Strict CSP for admin pages
  admin: {
    'default-src': ["'self'"],
    'script-src': ["'self'"],
    'style-src': [
      "'self'",
      "'unsafe-inline'",
      'https://fonts.googleapis.com',
    ],
    'font-src': ["'self'", 'https://fonts.gstatic.com'],
    'img-src': ["'self'", 'https:', 'data:'],
    'connect-src': ["'self'", 'https://dive-drop.supabase.co'],
    'frame-src': ["'none'"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
    'upgrade-insecure-requests': [],
  },

  // Relaxed CSP for public pages (for analytics, ads, etc.)
  public: {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      'https://cdn.vercel.com',
      "'unsafe-inline'",
    ],
    'style-src': [
      "'self'",
      "'unsafe-inline'",
      'https://fonts.googleapis.com',
    ],
    'font-src': ["'self'", 'https://fonts.gstatic.com'],
    'img-src': ["'self'", 'https:', 'data:'],
    'connect-src': [
      "'self'",
      'https:',
      'wss:',
    ],
    'frame-src': ["'self'"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
  },
};

/**
 * Build Content Security Policy header string
 */
function buildCSPHeader(config: Record<string, string[]>): string {
  return Object.entries(config)
    .map(([key, values]) => {
      if (values.length === 0) {
        return key;
      }
      return `${key} ${values.join(' ')}`;
    })
    .join('; ');
}

/**
 * Get CSP for specific page type
 */
export function getCSPHeader(pageType: 'default' | 'admin' | 'public' = 'default'): string {
  const config = CSP_CONFIG[pageType];
  return buildCSPHeader(config);
}

/**
 * Apply security headers to a Next.js Response
 */
export function applySecurityHeaders(
  response: NextResponse,
  pageType: 'default' | 'admin' | 'public' = 'default'
): NextResponse {
  // Apply all standard security headers
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // Apply CSP header based on page type
  const cspHeader = getCSPHeader(pageType);
  response.headers.set('Content-Security-Policy', cspHeader);

  // Development mode: add CSP report-only
  if (process.env.NODE_ENV === 'development') {
    response.headers.set(
      'Content-Security-Policy-Report-Only',
      cspHeader + "; report-uri https://api.dive-drop.com/csp-report"
    );
  }

  return response;
}

/**
 * Middleware helper: apply headers to request
 */
export function withSecurityHeaders(pageType: 'default' | 'admin' | 'public' = 'default') {
  return (response: NextResponse) => {
    return applySecurityHeaders(response, pageType);
  };
}

/**
 * Get headers object for route configuration
 * Use in next.config.ts or route segment config
 */
export function getSecurityHeadersConfig(
  pageType: 'default' | 'admin' | 'public' = 'default'
): Record<string, string | string[]> {
  const cspHeader = getCSPHeader(pageType);

  return {
    ...SECURITY_HEADERS,
    'Content-Security-Policy': cspHeader,
  };
}

/**
 * Validate if a URL is safe under CSP
 */
export function isURLSafeUnderCSP(url: string, directive: string): boolean {
  // This is a simple check - in production, use a full CSP parser
  const urlObj = new URL(url);

  const allowedDomains = [
    'dive-drop.com',
    'dive-drop.supabase.co',
    'cdn.vercel.com',
  ];

  return allowedDomains.some(domain => urlObj.hostname.endsWith(domain));
}

/**
 * Generate CSP nonce for inline scripts (when absolutely necessary)
 * Nonce should be unique per request
 */
export function generateNonce(): string {
  // Generate a random 16-byte value, base64 encoded
  const nonce = Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString('base64');
  return nonce;
}

/**
 * Build CSP header with nonce
 */
export function buildCSPWithNonce(
  pageType: 'default' | 'admin' | 'public',
  nonce: string
): string {
  const config = { ...CSP_CONFIG[pageType] };

  // Add nonce to script-src
  if (!config['script-src']) {
    config['script-src'] = [];
  }

  const scriptSrc = Array.isArray(config['script-src']) ? config['script-src'] : [];
  scriptSrc.push(`'nonce-${nonce}'`);
  config['script-src'] = scriptSrc;

  return buildCSPHeader(config);
}
