import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createWorkClient } from "@/lib/supabase/client-work";
import { canUpdateRequest, getRequestById, recordEvent } from "@/lib/requests";
import type { SessionUser } from "@/lib/auth";

type RouteContext = {
  params: Promise<{ id: string; memoId: string }>;
};

type MemoLookup =
  | {
      kind: "event";
      eventId: string;
      currentBody: string;
      currentAfter: Record<string, unknown>;
    }
  | {
      kind: "legacy";
      eventId: string;
      currentBody: string;
    };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await requireAuth();
    const { id, memoId } = await context.params;
    const requestRecord = await getRequestById(id);

    if (!requestRecord) {
      return NextResponse.json({ error: "요청을 찾을 수 없습니다." }, { status: 404 });
    }

    if (!canUpdateRequest(session, requestRecord)) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const body = await request.json();
    const memoBody = typeof body.body === "string" ? body.body.trim() : "";

    if (memoBody.length < 5) {
      return NextResponse.json(
        { error: "완료 메모는 5자 이상 입력해주세요." },
        { status: 400 },
      );
    }

    const lookup = await findMemo(id, memoId);
    if (!lookup) {
      return NextResponse.json({ error: "완료 메모를 찾을 수 없습니다." }, { status: 404 });
    }

    const supabase = createWorkClient();

    if (lookup.kind === "event") {
      if (typeof lookup.currentAfter.deletedAt === "string") {
        return NextResponse.json({ error: "삭제된 완료 메모입니다." }, { status: 400 });
      }

      const { error } = await supabase
        .from("events")
        .update({
          after: {
            ...lookup.currentAfter,
            body: memoBody,
            editedAt: new Date().toISOString(),
            editedBy: session.id,
            editedByName: session.fullName,
          },
        })
        .eq("id", lookup.eventId);

      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("requests")
        .update({ completion_note: memoBody })
        .eq("id", id);

      if (error) throw error;
    }

    await recordMemoChange({
      requestId: id,
      actor: session,
      eventType: "completion_note_edited",
      memoId,
      source: lookup.kind,
      beforeBody: lookup.currentBody,
      afterBody: memoBody,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("PATCH /api/requests/[id]/completion-memos/[memoId] error:", error);
    return NextResponse.json(
      { error: "완료 메모를 수정하지 못했습니다." },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const session = await requireAuth();
    const { id, memoId } = await context.params;
    const requestRecord = await getRequestById(id);

    if (!requestRecord) {
      return NextResponse.json({ error: "요청을 찾을 수 없습니다." }, { status: 404 });
    }

    if (!canUpdateRequest(session, requestRecord)) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const lookup = await findMemo(id, memoId);
    if (!lookup) {
      return NextResponse.json({ error: "완료 메모를 찾을 수 없습니다." }, { status: 404 });
    }

    const supabase = createWorkClient();

    if (lookup.kind === "event") {
      if (typeof lookup.currentAfter.deletedAt === "string") {
        return NextResponse.json({ ok: true });
      }

      const { error } = await supabase
        .from("events")
        .update({
          after: {
            ...lookup.currentAfter,
            deletedAt: new Date().toISOString(),
            deletedBy: session.id,
            deletedByName: session.fullName,
          },
        })
        .eq("id", lookup.eventId);

      if (error) throw error;
    } else {
      if (!lookup.currentBody) {
        return NextResponse.json({ ok: true });
      }

      if (requestRecord.status === "완료") {
        const hasAliveMemo = await hasAliveCompletionMemo(id);
        if (!hasAliveMemo) {
          return NextResponse.json(
            {
              error:
                "완료 상태에서는 마지막 완료 메모를 삭제할 수 없습니다. 다른 완료 메모를 먼저 작성하거나 요청 상태를 변경해주세요.",
            },
            { status: 400 },
          );
        }
      }

      const { error } = await supabase
        .from("requests")
        .update({ completion_note: null })
        .eq("id", id);

      if (error) throw error;
    }

    await recordMemoChange({
      requestId: id,
      actor: session,
      eventType: "completion_note_deleted",
      memoId,
      source: lookup.kind,
      beforeBody: lookup.currentBody,
      afterBody: null,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/requests/[id]/completion-memos/[memoId] error:", error);
    return NextResponse.json(
      { error: "완료 메모를 삭제하지 못했습니다." },
      { status: 500 },
    );
  }
}

async function findMemo(requestId: string, memoId: string): Promise<MemoLookup | null> {
  const supabase = createWorkClient();
  const { data: event, error } = await supabase
    .from("events")
    .select("*")
    .eq("id", memoId)
    .eq("request_id", requestId)
    .maybeSingle();

  if (error) throw error;
  if (!event) return null;

  const after = isRecord(event.after) ? event.after : {};

  if (event.event_type === "completion_note_created") {
    const body = typeof after.body === "string" ? after.body : "";
    return {
      kind: "event",
      eventId: event.id,
      currentBody: body,
      currentAfter: after,
    };
  }

  if (event.event_type === "request_updated") {
    const legacyBody =
      typeof after.completion_note === "string" ? after.completion_note : "";
    if (!legacyBody) return null;
    return {
      kind: "legacy",
      eventId: event.id,
      currentBody: legacyBody,
    };
  }

  return null;
}

async function hasAliveCompletionMemo(requestId: string): Promise<boolean> {
  const supabase = createWorkClient();
  const { data, error } = await supabase
    .from("events")
    .select("after")
    .eq("request_id", requestId)
    .eq("event_type", "completion_note_created");

  if (error) throw error;

  return (data ?? []).some((row) => {
    const after = isRecord(row.after) ? row.after : {};
    const body = typeof after.body === "string" ? after.body.trim() : "";
    const deleted = typeof after.deletedAt === "string";
    return body.length >= 5 && !deleted;
  });
}

async function recordMemoChange({
  requestId,
  actor,
  eventType,
  memoId,
  source,
  beforeBody,
  afterBody,
}: {
  requestId: string;
  actor: SessionUser;
  eventType: "completion_note_edited" | "completion_note_deleted";
  memoId: string;
  source: "event" | "legacy";
  beforeBody: string;
  afterBody: string | null;
}) {
  await recordEvent({
    requestId,
    actor,
    eventType,
    before: { body: beforeBody, memoId, source },
    after: afterBody === null ? { memoId, source } : { body: afterBody, memoId, source },
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
