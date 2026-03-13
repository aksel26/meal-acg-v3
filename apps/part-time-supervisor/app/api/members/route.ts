import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "@/lib/auth";

function createPublicServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

export async function GET() {
  try {
    await requireAuth();
    const supabase = createPublicServiceClient();

    const { data, error } = await supabase
      .from("members")
      .select("id, full_name, member_role")
      .order("full_name");

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/members error:", error);
    return NextResponse.json({ error: "Failed to fetch members" }, { status: 500 });
  }
}
