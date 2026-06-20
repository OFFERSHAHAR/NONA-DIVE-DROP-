/**
 * Vitest setup file
 * Runs before all tests to configure environment, mocks, and utilities
 */

import { expect, afterEach, vi } from 'vitest';

// Mock environment variables for testing
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
process.env.NODE_ENV = 'test';

// Mock Next.js server utilities
vi.mock('next/server', () => ({
  NextResponse: {
    json: (data: any, init?: any) => ({
      json: async () => data,
      status: init?.status || 200,
      ...init,
    }),
  },
  NextRequest: class {
    constructor(public url: string) {}
    json = async () => ({})
  },
}));

// Mock next/headers
vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    getAll: vi.fn(() => []),
    set: vi.fn(),
    delete: vi.fn(),
    get: vi.fn(),
    has: vi.fn(),
  })),
  headers: vi.fn(async () => ({
    get: vi.fn((name: string) => {
      const headerMap: Record<string, string> = {
        'x-forwarded-for': '127.0.0.1',
        'user-agent': 'test-agent',
      };
      return headerMap[name.toLowerCase()] || null;
    }),
  })),
}));

// Setup global test utilities
beforeEach(() => {
  // Clear all mocks before each test
  vi.clearAllMocks();
});

afterEach(() => {
  // Additional cleanup if needed
});

// Custom matchers for common assertions
expect.extend({
  toBeValidUUID(received: string) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const pass = uuidRegex.test(received);

    return {
      pass,
      message: () =>
        `expected ${received} to ${pass ? 'not ' : ''}be a valid UUID`,
    };
  },

  toBeValidEmail(received: string) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const pass = emailRegex.test(received);

    return {
      pass,
      message: () =>
        `expected ${received} to ${pass ? 'not ' : ''}be a valid email`,
    };
  },

  toBeWithinRange(received: number, min: number, max: number) {
    const pass = received >= min && received <= max;

    return {
      pass,
      message: () =>
        `expected ${received} to ${pass ? 'not ' : ''}be within range ${min}-${max}`,
    };
  },
});

// Extend Vitest's expect with custom matchers
declare global {
  namespace Vi {
    interface Matchers<R> {
      toBeValidUUID(): R;
      toBeValidEmail(): R;
      toBeWithinRange(min: number, max: number): R;
    }
  }
}

// Suppress console errors during tests (optional)
const originalError = console.error;
beforeEach(() => {
  console.error = vi.fn((...args: any[]) => {
    // Only suppress specific test-related errors
    if (
      args[0]?.includes?.('Not implemented: HTMLFormElement') ||
      args[0]?.includes?.('Not implemented: navigation')
    ) {
      return;
    }
    originalError.call(console, ...args);
  });
});

afterEach(() => {
  console.error = originalError;
});

export {};
