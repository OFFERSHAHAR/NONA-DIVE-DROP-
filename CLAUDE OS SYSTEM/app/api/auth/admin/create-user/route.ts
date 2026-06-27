import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  try {
    const { email, username, role } = await request.json();

    if (!email || !username || !role) {
      return NextResponse.json(
        { error: "Email, username, and role are required" },
        { status: 400 }
      );
    }

    // Verify admin
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookies: any) {},
      },
    });

    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data: currentUserProfile } = await supabase
      .from("users")
      .select("role")
      .eq("id", currentUser.id)
      .single();

    if (currentUserProfile?.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Use service role to create user
    const adminSupabase = createServerClient(supabaseUrl, supabaseServiceKey, {
      cookies: {
        getAll() {
          return [];
        },
        setAll(cookies: any) {},
      },
    });

    // Create temporary password
    const tempPassword = Math.random().toString(36).slice(-12);

    const { data, error } = await adminSupabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: false,
      user_metadata: {
        username,
      },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Create user profile
    const { data: userProfile, error: profileError } = await adminSupabase
      .from("users")
      .insert({
        id: data.user.id,
        email,
        username,
        role,
        is_online: false,
        last_seen: new Date().toISOString(),
      })
      .select();

    if (profileError) {
      throw profileError;
    }

    return NextResponse.json(
      {
        user: userProfile?.[0],
        message: `User created successfully. Temporary password: ${tempPassword}`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create user error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
