'use server';

import { createClient } from '@/lib/supabase/server';
import { registerSchema, loginSchema, type RegisterInput, type LoginInput } from './schemas';

export async function registerAction(data: RegisterInput) {
  try {
    // Validate input
    const validatedData = registerSchema.parse(data);

    // Check password confirmation
    if (validatedData.password !== validatedData.confirmPassword) {
      return {
        error: 'Passwords do not match',
      };
    }

    const supabase = await createClient();

    // Sign up with Supabase
    const { error: signUpError } = await supabase.auth.signUp({
      email: validatedData.email,
      password: validatedData.password,
      options: {
        data: {
          first_name: validatedData.firstName,
          last_name: validatedData.lastName,
        },
      },
    });

    if (signUpError) {
      return {
        error: signUpError.message,
      };
    }

    return {
      success: true,
      message: 'Registration successful! Please check your email to confirm.',
    };
  } catch (error) {
    if (error instanceof Error) {
      return {
        error: error.message,
      };
    }
    return {
      error: 'An unexpected error occurred',
    };
  }
}

export async function loginAction(data: LoginInput) {
  try {
    const validatedData = loginSchema.parse(data);
    const supabase = await createClient();

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: validatedData.email,
      password: validatedData.password,
    });

    if (signInError) {
      return {
        error: signInError.message,
      };
    }

    return {
      success: true,
      message: 'Login successful!',
    };
  } catch (error) {
    if (error instanceof Error) {
      return {
        error: error.message,
      };
    }
    return {
      error: 'An unexpected error occurred',
    };
  }
}

export async function logoutAction() {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
    return { success: true };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to logout',
    };
  }
}

export async function getCurrentUser() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  } catch {
    return null;
  }
}


// Alias for API routes that use getAuth
export async function getAuth() {
  const user = await getCurrentUser();
  return { user };
}
