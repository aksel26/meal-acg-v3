import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createWorkClient } from "@/lib/supabase/client-work";
import { isRequestPriority, recordEvent } from "@/lib/requests";
import { getRequestType } from "@/lib/masters";
import { canUpdateProject, getProjectById } from "@/lib/projects";

export async function GET(request: Request) {
  try {
    const session = await requireAuth();
    const supabase = createWorkClient();
    const { searchParams } = new URL(request.url);
    const view = searchParams.get("view");
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");

    let query = supabase
      .from("requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (view === "mine") {
      query = query.eq("requester_id", session.id);
    } else if (view === "queue") {
      query = query.or(
        `assignee_id.eq.${session.id},assignee_ids.cs.{${session.id}}`,
      );
    }
    if (status) query = query.eq("status", status);
    if (priority) query = query.eq("priority", priority);

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/requests error:", error);
    return NextResponse.json(
      { error: "요청 목록을 불러오지 못했습니다." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    const supabase = createWorkClient();
    const body = await request.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const requestType = getRequestType(body.requestType);
    const priority = isRequestPriority(body.priority)
      ? body.priority
      : requestType?.defaultPriority || "P3";

    if (!title) {
      return NextResponse.json(
        { error: "제목은 필수입니다." },
        { status: 400 },
      );
    }

    const dueDate =
      typeof body.dueDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.dueDate)
        ? body.dueDate
        : null;
    const assigneeIds = Array.isArray(body.assigneeIds)
      ? body.assigneeIds.filter((id: unknown) => typeof id === "string" && id)
      : body.assigneeId
        ? [body.assigneeId]
        : [];
    const assigneeNames = Array.isArray(body.assigneeNames)
      ? body.assigneeNames.filter(
          (name: unknown) => typeof name === "string" && name,
        )
      : body.assigneeName
        ? [body.assigneeName]
        : [];
    const teamNames = Array.isArray(body.teamNames)
      ? body.teamNames.filter(
          (name: unknown) => typeof name === "string" && name,
        )
      : body.teamName
        ? [body.teamName]
        : [];
    const customerNames = Array.isArray(body.customerNames)
      ? body.customerNames.filter(
          (name: unknown) => typeof name === "string" && name,
        )
      : [];
    const affiliateNames = Array.isArray(body.affiliateNames)
      ? body.affiliateNames.filter(
          (name: unknown) => typeof name === "string" && name,
        )
      : [];
    const projectId =
      typeof body.projectId === "string" && body.projectId ? body.projectId : null;

    if (projectId) {
      const project = await getProjectById(projectId);
      if (!project || !canUpdateProject(session, project)) {
        return NextResponse.json(
          { error: "선택한 프로젝트에 요청을 연결할 권한이 없습니다." },
          { status: 403 },
        );
      }
    }

    const { data, error } = await supabase
      .from("requests")
      .insert({
        title,
        body: typeof body.body === "string" ? body.body : null,
        priority,
        requester_id: session.id,
        requester_name: session.fullName,
        assignee_id: assigneeIds[0] || null,
        assignee_name: assigneeNames[0] || null,
        assignee_ids: assigneeIds,
        assignee_names: assigneeNames,
        team_name: teamNames[0] || null,
        team_names: teamNames,
        customer_names: customerNames,
        affiliate_names: affiliateNames,
        request_type: requestType?.id || null,
        request_type_name: requestType?.name || null,
        due_date: dueDate,
      })
      .select()
      .single();

    if (error) throw error;

    if (projectId) {
      const { error: linkError } = await supabase.from("project_requests").upsert(
        {
          project_id: projectId,
          request_id: data.id,
          linked_by: session.id,
          linked_by_name: session.fullName,
        },
        { onConflict: "project_id,request_id" },
      );
      if (linkError) throw linkError;
    }

    await recordEvent({
      requestId: data.id,
      actor: session,
      eventType: "request_created",
      after: { title, priority, requestType: requestType?.id ?? null },
    });

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("POST /api/requests error:", error);
    return NextResponse.json(
      { error: "요청을 생성하지 못했습니다." },
      { status: 500 },
    );
  }
}
