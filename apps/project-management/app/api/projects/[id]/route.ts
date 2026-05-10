import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import {
  canUpdateProject,
  getProjectById,
  getProjectDetailForUser,
  isProjectStatus,
} from "@/lib/projects";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const session = await requireAuth();
    const { id } = await context.params;
    const detail = await getProjectDetailForUser(id, session);

    if (!detail) {
      return NextResponse.json(
        { error: "프로젝트를 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    return NextResponse.json(detail);
  } catch (error) {
    console.error("GET /api/projects/[id] error:", error);
    return NextResponse.json(
      { error: "프로젝트 상세를 불러오지 못했습니다." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await requireAuth();
    const { id } = await context.params;
    const current = await getProjectById(id);

    if (!current) {
      return NextResponse.json(
        { error: "프로젝트를 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    if (!canUpdateProject(session, current)) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const body = await request.json();
    const updates: Record<string, unknown> = {};

    if (typeof body.title === "string") {
      const title = body.title.trim();
      if (!title) {
        return NextResponse.json(
          { error: "프로젝트명은 비울 수 없습니다." },
          { status: 400 },
        );
      }
      updates.title = title;
    }

    if (body.description !== undefined) {
      updates.description =
        typeof body.description === "string" ? body.description : null;
    }

    if (body.status !== undefined) {
      if (!isProjectStatus(body.status)) {
        return NextResponse.json(
          { error: "상태 값이 올바르지 않습니다." },
          { status: 400 },
        );
      }
      updates.status = body.status;
    }

    if (body.customerNames !== undefined) {
      updates.customer_names = getStringArray(body.customerNames);
    }

    if (body.affiliateNames !== undefined) {
      updates.affiliate_names = getStringArray(body.affiliateNames);
    }

    if (body.managerIds !== undefined) {
      updates.manager_ids = getStringArray(body.managerIds);
      updates.manager_names = getStringArray(body.managerNames);
    }

    if (body.stakeholderIds !== undefined) {
      updates.stakeholder_ids = getStringArray(body.stakeholderIds);
      updates.stakeholder_names = getStringArray(body.stakeholderNames);
    }

    if (body.stakeholderTeamIds !== undefined) {
      updates.stakeholder_team_ids = getStringArray(body.stakeholderTeamIds);
      updates.stakeholder_team_names = getStringArray(body.stakeholderTeamNames);
    }

    if (body.ownerId !== undefined) {
      updates.owner_id = typeof body.ownerId === "string" && body.ownerId ? body.ownerId : null;
      updates.owner_name =
        typeof body.ownerName === "string" && body.ownerName ? body.ownerName : null;
    }

    if (body.startDate !== undefined) {
      updates.start_date = getDateOrNull(body.startDate);
    }

    if (body.dueDate !== undefined) {
      updates.due_date = getDateOrNull(body.dueDate);
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(current);
    }

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("projects")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error("PATCH /api/projects/[id] error:", error);
    return NextResponse.json(
      { error: "프로젝트를 수정하지 못했습니다." },
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
