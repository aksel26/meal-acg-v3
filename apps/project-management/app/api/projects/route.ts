import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { isProjectStatus, listProjectsForUser } from "@/lib/projects";

export async function GET() {
  try {
    const session = await requireAuth();
    const projects = await listProjectsForUser(session);
    return NextResponse.json(projects);
  } catch (error) {
    console.error("GET /api/projects error:", error);
    return NextResponse.json(
      { error: "프로젝트 목록을 불러오지 못했습니다." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";

    if (!title) {
      return NextResponse.json(
        { error: "프로젝트명은 필수입니다." },
        { status: 400 },
      );
    }

    const managerIds = getStringArray(body.managerIds);
    const managerNames = getStringArray(body.managerNames);
    const stakeholderIds = getStringArray(body.stakeholderIds);
    const stakeholderNames = getStringArray(body.stakeholderNames);
    const stakeholderTeamIds = getStringArray(body.stakeholderTeamIds);
    const stakeholderTeamNames = getStringArray(body.stakeholderTeamNames);
    const ownerId = typeof body.ownerId === "string" && body.ownerId ? body.ownerId : managerIds[0] ?? null;
    const ownerName =
      typeof body.ownerName === "string" && body.ownerName
        ? body.ownerName
        : managerNames[0] ?? null;
    const status = isProjectStatus(body.status) ? body.status : "계획";

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("projects")
      .insert({
        title,
        description: typeof body.description === "string" ? body.description : null,
        customer_names: getStringArray(body.customerNames),
        affiliate_names: getStringArray(body.affiliateNames),
        owner_id: ownerId,
        owner_name: ownerName,
        manager_ids: managerIds,
        manager_names: managerNames,
        stakeholder_ids: stakeholderIds,
        stakeholder_names: stakeholderNames,
        stakeholder_team_ids: stakeholderTeamIds,
        stakeholder_team_names: stakeholderTeamNames,
        status,
        start_date: getDateOrNull(body.startDate),
        due_date: getDateOrNull(body.dueDate),
        created_by: session.id,
        created_by_name: session.fullName,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("POST /api/projects error:", error);
    return NextResponse.json(
      { error: "프로젝트를 생성하지 못했습니다." },
      { status: 500 },
    );
  }
}

function getStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

function getDateOrNull(value: unknown) {
  if (value === null || value === "") return null;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return null;
}
