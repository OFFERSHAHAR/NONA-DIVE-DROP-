import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Client for browser
export const createBrowserClient = () => {
  return createClient(supabaseUrl, supabaseAnonKey);
};

// Client for server-side operations
export const createServerClient = () => {
  return createClient(supabaseUrl, supabaseServiceKey);
};

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  role: "admin" | "user";
  created_at: string;
  last_seen: string;
  is_online: boolean;
}

export interface AuthSession {
  user: AuthUser;
  token: string;
  expiresAt: number;
}

/**
 * Sign up a new user (admin can create users)
 */
export async function signUp(email: string, password: string, username: string, role: "admin" | "user" = "user") {
  const supabase = createBrowserClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username,
        role,
      },
    },
  });

  if (error) throw error;

  return data;
}

/**
 * Sign in user
 */
export async function signIn(email: string, password: string) {
  const supabase = createBrowserClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;

  return data;
}

/**
 * Sign out
 */
export async function signOut() {
  const supabase = createBrowserClient();
  const { error } = await supabase.auth.signOut();

  if (error) throw error;
}

/**
 * Get current session
 */
export async function getSession() {
  const supabase = createBrowserClient();
  const { data, error } = await supabase.auth.getSession();

  if (error) throw error;

  return data.session;
}

/**
 * Get current user
 */
export async function getCurrentUser() {
  const supabase = createBrowserClient();

  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;

  if (!data.user) return null;

  // Fetch user profile from database
  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("*")
    .eq("id", data.user.id)
    .single();

  if (profileError && profileError.code !== "PGRST116") {
    throw profileError;
  }

  return profile as AuthUser | null;
}

/**
 * Reset password
 */
export async function resetPassword(email: string) {
  const supabase = createBrowserClient();

  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`,
  });

  if (error) throw error;

  return data;
}

/**
 * Update password
 */
export async function updatePassword(newPassword: string) {
  const supabase = createBrowserClient();

  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) throw error;

  return data;
}

/**
 * Create user (admin only)
 */
export async function createUser(email: string, username: string, role: "admin" | "user") {
  const response = await fetch("/api/auth/admin/create-user", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, username, role }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to create user");
  }

  return response.json();
}

/**
 * Update user role (admin only)
 */
export async function updateUserRole(userId: string, role: "admin" | "user") {
  const response = await fetch("/api/auth/admin/update-role", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, role }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to update user role");
  }

  return response.json();
}

/**
 * List all users (admin only)
 */
export async function listUsers() {
  const response = await fetch("/api/users", {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to list users");
  }

  return response.json();
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string) {
  const response = await fetch(`/api/users/${userId}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to get user");
  }

  return response.json();
}
