import { requireCareersAdmin } from "@/lib/auth";
import { data, route, throwIfError } from "@/lib/careers/http";
import {
  collectKeysetPages,
  KEYSET_PAGE_SIZE,
} from "@/lib/careers/keyset-pagination";
import { asRow, asRows, mapPosting } from "@/lib/careers/mappers";
import { todayInSeoul } from "@/lib/careers/date";
import {
  derivePostingStatus,
  deriveScheduleBucket,
  findScheduleRecord,
} from "@/lib/careers/parity";
import { createCareersServiceClient } from "@/lib/supabase/server";

export const GET = route(async () => {
  await requireCareersAdmin();
  const supabase = createCareersServiceClient();
  const [postingRows, applicationRows] = await Promise.all([
    collectKeysetPages(async (cursor) => {
      let builder = supabase
        .from("job_postings")
        .select("*")
        .is("deleted_at", null)
        .order("id", { ascending: true })
        .limit(KEYSET_PAGE_SIZE);
      if (cursor) builder = builder.gt("id", cursor);

      const { data: rows, error } = await builder;
      throwIfError(error);
      return rows ?? [];
    }),
    collectKeysetPages(async (cursor) => {
      let builder = supabase
        .from("applications")
        .select(
          "*, applicant:applicants!inner(id,name,deleted_at), posting:job_postings!inner(*, stages:job_posting_stages(*, statuses:stage_statuses(*))), stage_records:application_stage_records(*), final_result:application_final_results(*)",
        )
        .is("deleted_at", null)
        .is("applicant.deleted_at", null)
        .order("id", { ascending: true })
        .limit(KEYSET_PAGE_SIZE);
      if (cursor) builder = builder.gt("id", cursor);

      const { data: rows, error } = await builder;
      throwIfError(error);
      return rows ?? [];
    }),
  ]);

  const today = todayInSeoul();
  const postingCounts = new Map<
    string,
    {
      applicant_count: number;
      active_applicant_count: number;
      separated_applicant_count: number;
      upcoming_schedule_count: number;
      hired_count: number;
    }
  >();
  let activeApplications = 0;
  let upcomingSchedules = 0;
  let hired = 0;

  for (const application of applicationRows) {
    const posting = asRow(application.posting);
    const postingId = String(application.job_posting_id);
    const counts = postingCounts.get(postingId) ?? {
      applicant_count: 0,
      active_applicant_count: 0,
      separated_applicant_count: 0,
      upcoming_schedule_count: 0,
      hired_count: 0,
    };
    counts.applicant_count += application.status === "separated" ? 0 : 1;
    if (application.status !== "separated") counts.active_applicant_count += 1;
    if (application.status === "separated")
      counts.separated_applicant_count += 1;
    const finalResult = Array.isArray(application.final_result)
      ? application.final_result[0]
      : application.final_result;
    if (
      application.status !== "separated" &&
      finalResult?.result === "hired"
    )
      counts.hired_count += 1;

    const stages = asRows(posting.stages).map((stage) => ({
      id: String(stage.id),
      name: String(stage.name),
      order: Number(stage.display_order),
      showOnCalendar: stage.show_on_calendar === true,
      statuses: asRows(stage.statuses).map((status) => ({
        id: String(status.id),
        isDefault: status.is_default === true,
        isCompletion: status.is_completion === true,
      })),
    }));
    const records = asRows(application.stage_records).map((record) => ({
      stageId: String(record.stage_id),
      statusId: String(record.status_id),
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
      updatedAt: String(record.updated_at),
    }));
    const schedule = findScheduleRecord(records, stages);
    const isUpcoming =
      schedule &&
      deriveScheduleBucket(schedule.record, Boolean(finalResult), today) ===
        "upcoming";
    if (application.status !== "separated" && isUpcoming)
      counts.upcoming_schedule_count += 1;
    postingCounts.set(postingId, counts);

    if (derivePostingStatus(String(posting.end_date)) !== "진행중") continue;
    if (application.status !== "separated") activeApplications += 1;
    if (application.status !== "separated" && isUpcoming)
      upcomingSchedules += 1;
    if (
      application.status !== "separated" &&
      finalResult?.result === "hired"
    )
      hired += 1;
  }

  const postings = postingRows
    .sort((left, right) => {
      if (!left.end_date) return right.end_date ? 1 : 0;
      if (!right.end_date) return -1;
      return left.end_date.localeCompare(right.end_date);
    })
    .map((posting) =>
      mapPosting({ ...posting, ...postingCounts.get(posting.id) }),
    );
  return data({
    openPostings: postings.filter(
      (posting) => posting.derivedStatus === "진행중",
    ).length,
    activeApplications,
    upcomingApplicationCount: upcomingSchedules,
    hiredApplicationCount: hired,
    // Compatibility for screens migrating from the first Careers contract.
    scheduledThisWeek: upcomingSchedules,
    completedApplications: hired,
    postings,
  });
});
