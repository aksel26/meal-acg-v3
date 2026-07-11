import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getAuthErrorStatus, requireAdmin } from "@/lib/auth";

const MEMBERS_DATA = [
  { login_id: "권동균", full_name: "권동균", role: "user" },
  { login_id: "김낙균", full_name: "김낙균", role: "user" },
  { login_id: "김다은", full_name: "김다은", role: "user" },
  { login_id: "김다희", full_name: "김다희", role: "user" },
  { login_id: "김단아", full_name: "김단아", role: "user" },
  { login_id: "김대희", full_name: "김대희", role: "user" },
  { login_id: "김도윤", full_name: "김도윤", role: "user" },
  { login_id: "김동건", full_name: "김동건", role: "user" },
  { login_id: "김선경", full_name: "김선경", role: "user" },
  { login_id: "김소윤", full_name: "김소윤", role: "user" },
  { login_id: "김영만", full_name: "김영만", role: "user" },
  { login_id: "김윤경", full_name: "김윤경", role: "user" },
  { login_id: "김현민", full_name: "김현민", role: "user" },
  { login_id: "김현해", full_name: "김현해", role: "user" },
  { login_id: "박세령", full_name: "박세령", role: "user" },
  { login_id: "신효은", full_name: "신효은", role: "user" },
  { login_id: "안나연", full_name: "안나연", role: "user" },
  { login_id: "안정훈", full_name: "안정훈", role: "user" },
  { login_id: "양우연", full_name: "양우연", role: "user" },
  { login_id: "윤이나", full_name: "윤이나", role: "admin" },
  { login_id: "윤지현", full_name: "윤지현", role: "user" },
  { login_id: "이다빈", full_name: "이다빈", role: "user" },
  { login_id: "이다애", full_name: "이다애", role: "user" },
  { login_id: "이서현", full_name: "이서현", role: "user" },
  { login_id: "이솔빈", full_name: "이솔빈", role: "user" },
  { login_id: "이승현", full_name: "이승현", role: "user" },
  { login_id: "이예린", full_name: "이예린", role: "user" },
  { login_id: "이채령", full_name: "이채령", role: "user" },
  { login_id: "장문경", full_name: "장문경", role: "user" },
  { login_id: "전승환", full_name: "전승환", role: "user" },
  { login_id: "한미희", full_name: "한미희", role: "user" },
  { login_id: "홍경희", full_name: "홍경희", role: "user" },
  { login_id: "홍세영", full_name: "홍세영", role: "admin" },
  { login_id: "홍찬미", full_name: "홍찬미", role: "user" },
  { login_id: "황희은", full_name: "황희은", role: "user" },
];

// POST /api/seed/members - Seed members data
export async function POST() {
  try {
    // 운영 환경에서는 시드 실행 자체를 차단한다
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await requireAdmin();
    const supabase = createServiceClient();

    const membersToInsert = MEMBERS_DATA.map((member) => ({
      ...member,
      password: "password123", // Default password
    }));

    // ignoreDuplicates: 기존 계정의 password/role을 절대 덮어쓰지 않는다
    const { data, error } = await supabase
      .from("members")
      .upsert(membersToInsert, {
        onConflict: "login_id",
        ignoreDuplicates: true,
      })
      .select("id, login_id, full_name, role");

    if (error) {
      console.error("Error seeding members:", error);
      return NextResponse.json(
        { error: "Failed to seed members", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `${data?.length || 0} members seeded successfully`,
      data,
    });
  } catch (error) {
    console.error("Seed members API error:", error);
    const authStatus = getAuthErrorStatus(error);
    if (authStatus) {
      return NextResponse.json({ error: "Unauthorized" }, { status: authStatus });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET /api/seed/members - Get current members count
export async function GET() {
  try {
    await requireAdmin();
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from("members")
      .select("id, login_id, full_name, role")
      .order("full_name");

    if (error) {
      console.error("Error fetching members:", error);
      return NextResponse.json(
        { error: "Failed to fetch members" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      total: data?.length || 0,
      admins: data?.filter((m) => m.role === "admin").length || 0,
      users: data?.filter((m) => m.role === "user").length || 0,
      members: data,
    });
  } catch (error) {
    console.error("Get members API error:", error);
    const authStatus = getAuthErrorStatus(error);
    if (authStatus) {
      return NextResponse.json({ error: "Unauthorized" }, { status: authStatus });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
