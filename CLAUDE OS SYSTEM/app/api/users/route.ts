import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookies: any) {},
      },
    });

    // Verify current user is authenticated
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Fetch current user profile to check role
    const { data: currentUserProfile } = await supabase
      .from("users")
      .select("role")
      .eq("id", currentUser.id)
      .single();

    // Only admins can list all users
    if (currentUserProfile?.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // List all users
    const { data: users, error } = await supabase
      .from("users")
      .select("id, email, username, role, created_at, last_seen, is_online")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json(users, { status: 200 });
  } catch (error) {
    console.error("List users error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
