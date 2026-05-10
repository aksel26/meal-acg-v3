import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { REQUEST_TYPES } from "@/lib/masters";
import { createPublicServiceClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    await requireAuth();
    const supabase = createPublicServiceClient();

    const [
      { data: members, error: membersError },
      { data: teams, error: teamsError },
      { data: clients, error: clientsError },
    ] =
      await Promise.all([
        supabase
          .from("members")
          .select("id, full_name, role, member_role, team_id")
          .order("full_name", { ascending: true }),
        supabase.from("teams").select("id, name").order("name", { ascending: true }),
        supabase
          .schema("supervisor")
          .from("clients")
          .select("id, name, parent_company")
          .order("name", { ascending: true }),
      ]);

    if (membersError) throw membersError;
    if (teamsError) throw teamsError;
    if (clientsError) throw clientsError;

    const customerGroups = [
      ...new Set((clients ?? []).map((client) => client.parent_company || client.name)),
    ].sort((a, b) => a.localeCompare(b, "ko-KR"));

    return NextResponse.json({
      requestTypes: REQUEST_TYPES,
      members: members ?? [],
      teams: teams ?? [],
      clients: clients ?? [],
      customerGroups,
    });
  } catch (error) {
    console.error("GET /api/masters error:", error);
    return NextResponse.json(
      { error: "마스터 데이터를 불러오지 못했습니다." },
      { status: 500 },
    );
  }
}
