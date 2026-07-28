import { requireCareersAdmin } from "@/lib/auth";
import { ApiError, data, query, route, throwIfError } from "@/lib/careers/http";
import { mapApplication, mapPosting, mapStage } from "@/lib/careers/mappers";
import { page, withNextCursor } from "@/lib/careers/pagination";
import { createCareersServiceClient } from "@/lib/supabase/server";
import { uuid } from "@/lib/validation";

export const GET = route(async (request: Request) => {
  await requireCareersAdmin();
  const search = query(request);
  const postingId = uuid(search.get("postingId"), "공고 ID");
  const { limit, cursor } = page(search);
  const supabase = createCareersServiceClient();
  let applicationQuery = supabase
    .from("applications")
    .select(
      "*, applicant:applicants!inner(*), posting:job_postings(*, cover_letter_questions(*), stages:job_posting_stages(*, statuses:stage_statuses(*))), stage:job_posting_stages!applications_current_stage_id_job_posting_id_fkey(*), stage_status:stage_statuses!applications_current_status_id_current_stage_id_fkey(*), stage_records:application_stage_records(*), final_result:application_final_results(*)",
    )
    .eq("job_posting_id", postingId)
    .in("status", ["active", "completed"])
    .is("deleted_at", null)
    .is("applicant.deleted_at", null)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit + 1);
  if (cursor) {
    applicationQuery = applicationQuery.or(
      `created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`,
    );
  }

  const [postingResult, stagesResult, applicationsResult] = await Promise.all([
    supabase
      .from("job_postings")
      .select("*, cover_letter_questions(*)")
      .eq("id", postingId)
      .is("deleted_at", null)
      .maybeSingle(),
    supabase
      .from("job_posting_stages")
      .select("*, statuses:stage_statuses(*)")
      .eq("job_posting_id", postingId)
      .eq("is_active", true)
      .order("display_order"),
    applicationQuery,
  ]);
  throwIfError(postingResult.error);
  throwIfError(stagesResult.error);
  throwIfError(applicationsResult.error);
  if (!postingResult.data) throw new ApiError("공고를 찾을 수 없습니다.", 404);

  const applicationPage = withNextCursor(applicationsResult.data ?? [], limit);
  const applications = applicationPage.items.map(mapApplication);
  return data({
    posting: mapPosting(postingResult.data),
    columns: (stagesResult.data ?? []).map((stage) => ({
      stage: mapStage(stage),
      applications: applications.filter(
        (application) => application.stageId === stage.id,
      ),
    })),
    nextCursor: applicationPage.nextCursor,
  });
});
