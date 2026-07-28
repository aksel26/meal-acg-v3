import { throwIfError } from "@/lib/careers/http";
import {
  chunkValues,
  POSTING_STAGE_BATCH_SIZE,
} from "@/lib/careers/keyset-pagination";
import { asRow, asRows } from "@/lib/careers/mappers";
import { deriveScheduleBucket, findScheduleRecord } from "@/lib/careers/parity";
import { todayInSeoul } from "@/lib/careers/date";
import { createCareersServiceClient } from "@/lib/supabase/server";

const APPLICATION_COUNT_PAGE_SIZE = 1_000;

type PostingCounts = {
  applicant_count: number;
  active_applicant_count: number;
  separated_applicant_count: number;
  upcoming_schedule_count: number;
  hired_count: number;
};

export async function getPostingCounts(
  supabase: ReturnType<typeof createCareersServiceClient>,
  postingIds: string[],
) {
  const counts = new Map<string, PostingCounts>();
  for (const postingId of postingIds) {
    counts.set(postingId, {
      applicant_count: 0,
      active_applicant_count: 0,
      separated_applicant_count: 0,
      upcoming_schedule_count: 0,
      hired_count: 0,
    });
  }
  if (postingIds.length === 0) return counts;

  const today = todayInSeoul();
  for (const postingIdBatch of chunkValues(
    postingIds,
    POSTING_STAGE_BATCH_SIZE,
  )) {
    const { data: stageRows, error: stageError } = await supabase
      .from("job_posting_stages")
      .select("id, job_posting_id, name, display_order, show_on_calendar")
      .in("job_posting_id", postingIdBatch)
      .eq("is_active", true)
      .eq("show_on_calendar", true)
      .order("display_order", { ascending: true });
    throwIfError(stageError);
    const stagesByPosting = new Map<
      string,
      Array<{
        id: string;
        name: string;
        order: number;
        showOnCalendar: boolean;
        statuses: [];
      }>
    >();
    for (const stage of stageRows ?? []) {
      const stages = stagesByPosting.get(stage.job_posting_id) ?? [];
      stages.push({
        id: stage.id,
        name: stage.name,
        order: stage.display_order,
        showOnCalendar: stage.show_on_calendar === true,
        statuses: [],
      });
      stagesByPosting.set(stage.job_posting_id, stages);
    }

    let cursor: string | null = null;
    while (true) {
      let builder = supabase
        .from("applications")
        .select(
          "id, job_posting_id, status, applicant:applicants!inner(id), stage_records:application_stage_records(stage_id,status_id,start_date,end_date,event_time,note), final_result:application_final_results(result)",
        )
        .in("job_posting_id", postingIdBatch)
        .is("deleted_at", null)
        .is("applicant.deleted_at", null)
        .order("id", { ascending: true })
        .limit(APPLICATION_COUNT_PAGE_SIZE);
      if (cursor) builder = builder.gt("id", cursor);

      const { data: applications, error } = await builder;
      throwIfError(error);
      for (const application of applications ?? []) {
        const postingCounts = counts.get(application.job_posting_id);
        if (!postingCounts) continue;
        if (application.status === "separated") {
          postingCounts.separated_applicant_count += 1;
          continue;
        }
        if (
          application.status !== "active" &&
          application.status !== "completed"
        ) {
          continue;
        }

        postingCounts.applicant_count += 1;
        postingCounts.active_applicant_count += 1;
        const finalResult = Array.isArray(application.final_result)
          ? application.final_result[0]
          : application.final_result;
        if (asRow(finalResult).result === "hired") {
          postingCounts.hired_count += 1;
        }

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
        }));
        const schedule = findScheduleRecord(
          records,
          stagesByPosting.get(application.job_posting_id) ?? [],
        );
        if (
          schedule &&
          deriveScheduleBucket(schedule.record, Boolean(finalResult), today) ===
            "upcoming"
        ) {
          postingCounts.upcoming_schedule_count += 1;
        }
      }

      if (!applications || applications.length < APPLICATION_COUNT_PAGE_SIZE) {
        break;
      }
      cursor = applications[applications.length - 1]!.id;
    }
  }

  return counts;
}
