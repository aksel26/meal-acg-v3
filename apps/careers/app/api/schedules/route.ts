import { requireCareersAdmin } from "@/lib/auth";
import { data, query, route, throwIfError } from "@/lib/careers/http";
import {
  collectKeysetPages,
  KEYSET_PAGE_SIZE,
} from "@/lib/careers/keyset-pagination";
import { todayInSeoul } from "@/lib/careers/date";
import { asRow, asRows, mapSchedule } from "@/lib/careers/mappers";
import { deriveScheduleBucket, findScheduleRecord } from "@/lib/careers/parity";
import { scheduleInput } from "@/lib/careers/schedules";
import { createCareersServiceClient } from "@/lib/supabase/server";
import { dateTime, json } from "@/lib/validation";

export const GET = route(async (request: Request) => {
  await requireCareersAdmin();
  const search = query(request);
  const supabase = createCareersServiceClient();
  const rows = await collectKeysetPages(async (cursor) => {
    let builder = supabase
      .from("applications")
      .select(
        "*, applicant:applicants!inner(*), posting:job_postings!inner(*, stages:job_posting_stages(*, statuses:stage_statuses(*))), stage_records:application_stage_records(*), final_result:application_final_results(*)",
      )
      .in("status", ["active", "completed"])
      .is("deleted_at", null)
      .is("applicant.deleted_at", null)
      .order("id", { ascending: true })
      .limit(KEYSET_PAGE_SIZE);
    if (cursor) builder = builder.gt("id", cursor);

    const { data: pageRows, error } = await builder;
    throwIfError(error);
    return pageRows ?? [];
  });
  const from = search.get("from")
    ? dateTime(search.get("from"), "시작 범위", true)!
    : null;
  const to = search.get("to")
    ? dateTime(search.get("to"), "종료 범위", true)!
    : null;
  const today = todayInSeoul();
  const items = rows.flatMap((application) => {
    const posting = asRow(application.posting);
    const applicant = asRow(application.applicant);
    const stages = asRows(posting.stages).map((stage) => ({
      id: String(stage.id ?? ""),
      name: String(stage.name ?? ""),
      order: Number(stage.display_order ?? 0),
      showOnCalendar: stage.show_on_calendar === true,
      statuses: asRows(stage.statuses).map((status) => ({
        id: String(status.id ?? ""),
        isDefault: status.is_default === true,
        isCompletion: status.is_completion === true,
      })),
    }));
    const records = asRows(application.stage_records).map((record) => ({
      stageId: String(record.stage_id ?? ""),
      statusId: String(record.status_id ?? ""),
      meta: {
        startDate:
          typeof record.start_date === "string"
            ? record.start_date
            : undefined,
        endDate:
          typeof record.end_date === "string" ? record.end_date : undefined,
        time:
          typeof record.event_time === "string"
            ? record.event_time.slice(0, 5)
            : undefined,
        note: typeof record.note === "string" ? record.note : undefined,
      },
      updatedAt: String(record.updated_at ?? ""),
    }));
    const match = findScheduleRecord(records, stages);
    if (!match) return [];
    const date = String(match.record.meta?.endDate ?? "");
    const time = String(match.record.meta?.time ?? "");
    const startsAt = date
      ? new Date(`${date}T${time || "00:00"}:00+09:00`).toISOString()
      : "";
    if ((from && startsAt < from) || (to && startsAt >= to)) return [];
    const finalResult = Array.isArray(application.final_result)
      ? application.final_result[0]
      : application.final_result;
    const bucket = deriveScheduleBucket(
      match.record,
      Boolean(finalResult),
      today,
    );
    return [
      {
        id: `${application.id}:${match.stage.id}`,
        applicationId: application.id,
        postingId: posting.id,
        stageId: match.stage.id,
        applicantName: applicant.name,
        postingTitle: posting.title,
        stageName: match.stage.name,
        title: `${match.stage.name} - ${applicant.name}`,
        startsAt,
        endsAt: null,
        location: null,
        note: match.record.meta?.note ?? null,
        status: bucket === "completed" ? "completed" : "scheduled",
        bucket,
        date,
        time,
        email: applicant.email ?? "",
        phone: applicant.phone ?? "",
        region: applicant.region ?? "",
        field: posting.field ?? posting.department ?? "",
        finalResult: finalResult
          ? {
              result: finalResult.result,
              reason: finalResult.note ?? null,
              decidedAt: finalResult.decided_at,
            }
          : null,
      },
    ];
  });
  items.sort((left, right) => left.startsAt.localeCompare(right.startsAt));
  return data({
    upcoming: items.filter((item) => item.bucket === "upcoming"),
    overdue: items.filter((item) => item.bucket === "overdue"),
    completed: items.filter((item) => item.bucket === "completed"),
  });
});

export const POST = route(async (request: Request) => {
  const admin = await requireCareersAdmin();
  const input = scheduleInput(await json(request));
  const { data: schedule, error } = await createCareersServiceClient()
    .from("schedule_events")
    .insert({ ...input, created_by: admin.id, updated_by: admin.id })
    .select()
    .single();
  throwIfError(error);
  return data(mapSchedule(schedule), 201);
});
