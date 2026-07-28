import { requireCareersAdmin } from "@/lib/auth";
import { data, query, route, throwIfError } from "@/lib/careers/http";
import { mapSeparatedApplication } from "@/lib/careers/mappers";
import { page, withNextCursor } from "@/lib/careers/pagination";
import { createCareersServiceClient } from "@/lib/supabase/server";
import { SEPARATED_SORTS } from "@/lib/types";
import { oneOf, searchTerm, uuid } from "@/lib/validation";

const FETCH_PAGE_SIZE = 1_000;

export const GET = route(async (request: Request) => {
  await requireCareersAdmin();
  const search = query(request);
  const { limit, cursor } = page(search);
  const supabase = createCareersServiceClient();
  const postingId = search.get("postingId")
    ? uuid(search.get("postingId"), "공고 ID")
    : null;
  const rows: SeparatedApplicationRow[] = [];
  let fetchCursor: string | null = null;
  while (true) {
    let builder = supabase
      .from("applications")
      .select(
        "*, applicant:applicants!inner(*), posting:job_postings(*, cover_letter_questions(*), stages:job_posting_stages(*, statuses:stage_statuses(*))), stage:job_posting_stages!applications_current_stage_id_job_posting_id_fkey(*), stage_status:stage_statuses!applications_current_status_id_current_stage_id_fkey(*), stage_records:application_stage_records(*), final_result:application_final_results(*), separations:application_separations(*)",
      )
      .eq("status", "separated")
      .is("deleted_at", null)
      .is("applicant.deleted_at", null)
      .order("id", { ascending: true })
      .limit(FETCH_PAGE_SIZE);
    if (postingId) builder = builder.eq("job_posting_id", postingId);
    if (fetchCursor) builder = builder.gt("id", fetchCursor);

    const { data: pageRows, error } = await builder;
    throwIfError(error);
    rows.push(...(pageRows ?? []));
    if (!pageRows || pageRows.length < FETCH_PAGE_SIZE) break;
    fetchCursor = pageRows[pageRows.length - 1]!.id;
  }

  const keyword = searchTerm(search.get("search"))?.toLocaleLowerCase("ko");
  const mapped = rows.map(mapSeparatedApplication).filter((item) => {
    if (!keyword) return true;
    return [
      item.applicantName,
      item.email,
      item.phone,
      item.memo,
      item.separatedReason,
    ].some((value) => value?.toLocaleLowerCase("ko").includes(keyword));
  });
  const sort = oneOf(
    search.get("sort"),
    SEPARATED_SORTS,
    "정렬",
    "recentSeparated",
  );
  mapped.sort((left, right) => {
    if (sort === "oldestSeparated")
      return String(left.separatedAt).localeCompare(String(right.separatedAt));
    if (sort === "applicationNewest")
      return right.appliedAt.localeCompare(left.appliedAt);
    return String(right.separatedAt).localeCompare(String(left.separatedAt));
  });
  const cursorIndex = cursor
    ? mapped.findIndex((application) => application.id === cursor.id) + 1
    : 0;
  const slice = mapped.slice(cursorIndex, cursorIndex + limit + 1);
  const result = withNextCursor(
    slice.map((item) => ({
      ...item,
      created_at: item.separatedAt || item.appliedAt,
    })),
    limit,
  );
  return data({
    ...result,
    items: result.items.map(({ created_at, ...item }) => {
      void created_at;
      return item;
    }),
  });
});

type SeparatedApplicationRow = Record<string, unknown> & {
  id: string;
  created_at: string;
};
