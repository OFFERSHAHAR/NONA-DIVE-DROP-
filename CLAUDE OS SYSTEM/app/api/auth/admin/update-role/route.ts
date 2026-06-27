import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(request: NextRequest) {
  try {
    const { userId, role } = await request.json();

    if (!userId || !role) {
      return NextResponse.json({ error: "User ID and role are required" }, { status: 400 });
    }

    if (!["admin", "user"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookies: any) {},
      },
    });

    // Verify admin
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

    // Update user role
    const { data, error } = await supabase
      .from("users")
      .update({ role })
      .eq("id", userId)
      .select();

    if (error) throw error;

    return NextResponse.json(data?.[0], { status: 200 });
  } catch (error) {
    console.error("Update role error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
