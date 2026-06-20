/**
 * Integration tests for auth API endpoints
 * Tests registration, login, and session management flows
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { registerAction, loginAction, logoutAction, getCurrentUser } from '@/lib/auth/actions';

// Mock Supabase client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

describe('Auth API Integration Tests', () => {
  let mockSupabaseClient: any;

  beforeEach(() => {
    mockSupabaseClient = {
      auth: {
        signUp: vi.fn(),
        signInWithPassword: vi.fn(),
        signOut: vi.fn(),
        getUser: vi.fn(),
      },
    };

    vi.mocked(require('@/lib/supabase/server').createClient).mockResolvedValue(
      mockSupabaseClient
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('registerAction', () => {
    it('should successfully register a new user', async () => {
      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: { id: 'user-123', email: 'test@example.com' } },
        error: null,
      });

      const result = await registerAction({
        email: 'test@example.com',
        password: 'SecurePass123',
        confirmPassword: 'SecurePass123',
        firstName: 'John',
        lastName: 'Doe',
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('Registration successful');
      expect(mockSupabaseClient.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'SecurePass123',
        options: {
          data: {
            first_name: 'John',
            last_name: 'Doe',
          },
        },
      });
    });

    it('should reject mismatched passwords', async () => {
      const result = await registerAction({
        email: 'test@example.com',
        password: 'SecurePass123',
        confirmPassword: 'DifferentPass123',
        firstName: 'John',
        lastName: 'Doe',
      });

      expect(result.error).toContain('Passwords do not match');
      expect(mockSupabaseClient.auth.signUp).not.toHaveBeenCalled();
    });

    it('should reject invalid password', async () => {
      const result = await registerAction({
        email: 'test@example.com',
        password: 'weak',
        confirmPassword: 'weak',
        firstName: 'John',
        lastName: 'Doe',
      });

      expect(result.error).toBeTruthy();
      expect(mockSupabaseClient.auth.signUp).not.toHaveBeenCalled();
    });

    it('should handle Supabase auth errors', async () => {
      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: null,
        error: {
          message: 'User already exists',
        },
      });

      const result = await registerAction({
        email: 'existing@example.com',
        password: 'SecurePass123',
        confirmPassword: 'SecurePass123',
        firstName: 'John',
        lastName: 'Doe',
      });

      expect(result.error).toContain('User already exists');
    });

    it('should reject invalid email format', async () => {
      const result = await registerAction({
        email: 'not-an-email',
        password: 'SecurePass123',
        confirmPassword: 'SecurePass123',
        firstName: 'John',
        lastName: 'Doe',
      });

      expect(result.error).toBeTruthy();
    });

    it('should handle unexpected errors gracefully', async () => {
      mockSupabaseClient.auth.signUp.mockRejectedValue(new Error('Network error'));

      const result = await registerAction({
        email: 'test@example.com',
        password: 'SecurePass123',
        confirmPassword: 'SecurePass123',
        firstName: 'John',
        lastName: 'Doe',
      });

      expect(result.error).toContain('Network error');
    });
  });

  describe('loginAction', () => {
    it('should successfully login a user', async () => {
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: { id: 'user-123', email: 'test@example.com' } },
        error: null,
      });

      const result = await loginAction({
        email: 'test@example.com',
        password: 'SecurePass123',
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('Login successful');
      expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'SecurePass123',
      });
    });

    it('should reject invalid credentials', async () => {
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: null,
        error: {
          message: 'Invalid login credentials',
        },
      });

      const result = await loginAction({
        email: 'test@example.com',
        password: 'WrongPassword',
      });

      expect(result.error).toContain('Invalid login credentials');
    });

    it('should reject empty password', async () => {
      const result = await loginAction({
        email: 'test@example.com',
        password: '',
      });

      expect(result.error).toBeTruthy();
      expect(mockSupabaseClient.auth.signInWithPassword).not.toHaveBeenCalled();
    });

    it('should reject invalid email', async () => {
      const result = await loginAction({
        email: 'not-an-email',
        password: 'SomePassword',
      });

      expect(result.error).toBeTruthy();
    });

    it('should handle network errors', async () => {
      mockSupabaseClient.auth.signInWithPassword.mockRejectedValue(
        new Error('Network timeout')
      );

      const result = await loginAction({
        email: 'test@example.com',
        password: 'SecurePass123',
      });

      expect(result.error).toContain('Network timeout');
    });
  });

  describe('logoutAction', () => {
    it('should successfully logout a user', async () => {
      mockSupabaseClient.auth.signOut.mockResolvedValue({
        error: null,
      });

      const result = await logoutAction();

      expect(result.success).toBe(true);
      expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled();
    });

    it('should handle logout errors gracefully', async () => {
      mockSupabaseClient.auth.signOut.mockRejectedValue(new Error('Logout failed'));

      const result = await logoutAction();

      expect(result.error).toContain('Logout failed');
    });
  });

  describe('getCurrentUser', () => {
    it('should return current user when authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: 'user-123',
            email: 'test@example.com',
          },
        },
      });

      const user = await getCurrentUser();

      expect(user).toBeTruthy();
      expect(user?.id).toBe('user-123');
      expect(user?.email).toBe('test@example.com');
    });

    it('should return null when not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: {
          user: null,
        },
      });

      const user = await getCurrentUser();

      expect(user).toBeNull();
    });

    it('should handle getUser errors gracefully', async () => {
      mockSupabaseClient.auth.getUser.mockRejectedValue(new Error('Session error'));

      const user = await getCurrentUser();

      expect(user).toBeNull();
    });
  });
});
