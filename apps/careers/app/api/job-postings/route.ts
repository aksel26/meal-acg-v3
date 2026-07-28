import { requireCareersAdmin } from "@/lib/auth";
import { ApiError, data, query, route, throwIfError } from "@/lib/careers/http";
import { mapPosting } from "@/lib/careers/mappers";
import { derivePostingStatus } from "@/lib/careers/parity";
import { page, withNextCursor } from "@/lib/careers/pagination";
import { getPostingCounts } from "@/lib/careers/posting-counts";
import { createCareersServiceClient } from "@/lib/supabase/server";
import { CAREER_TYPES, EMPLOYMENT_TYPES, POSTING_SORTS } from "@/lib/types";
import { boolean, json, oneOf, searchTerm, text } from "@/lib/validation";

export const GET = route(async (request: Request) => {
  await requireCareersAdmin();
  const search = query(request);
  const { limit, cursor } = page(search);
  const supabase = createCareersServiceClient();
  const status = search.get("status");
  const employmentType = search.get("employmentType");
  const field = searchTerm(search.get("field"));
  const normalizedEmploymentType = employmentType
    ? oneOf(employmentType, EMPLOYMENT_TYPES, "고용 형태")
    : null;
  const keyword = searchTerm(search.get("search"));
  const rows = await fetchAllPostings(supabase, {
    employmentType: normalizedEmploymentType,
    field,
    keyword,
  });
  const derivedStatus = status
    ? oneOf(status, ["진행중", "종료"] as const, "공고 상태")
    : null;
  const sort = oneOf(search.get("sort"), POSTING_SORTS, "정렬", "deadlineAsc");
  const filtered = rows.filter(
    (posting) =>
      !derivedStatus || derivePostingStatus(posting.end_date) === derivedStatus,
  );
  const counts = await getPostingCounts(
    supabase,
    filtered.map((posting) => posting.id),
  );
  filtered.sort((left, right) => {
    const leftCount = counts.get(left.id)?.applicant_count ?? 0;
    const rightCount = counts.get(right.id)?.applicant_count ?? 0;
    if (sort === "deadlineAsc")
      return String(left.end_date || "9999-12-31").localeCompare(
        String(right.end_date || "9999-12-31"),
      );
    if (sort === "createdAsc")
      return String(left.created_at).localeCompare(String(right.created_at));
    if (sort === "updatedDesc")
      return String(right.updated_at).localeCompare(String(left.updated_at));
    if (sort === "applicantsDesc") return rightCount - leftCount;
    if (sort === "applicantsAsc") return leftCount - rightCount;
    if (sort === "statusFirst") {
      const rank = (value: unknown) =>
        derivePostingStatus(typeof value === "string" ? value : null) ===
        "진행중"
          ? 0
          : 1;
      return (
        rank(left.end_date) - rank(right.end_date) ||
        String(right.created_at).localeCompare(String(left.created_at))
      );
    }
    return String(right.created_at).localeCompare(String(left.created_at));
  });
  const cursorIndex = cursor
    ? filtered.findIndex((posting) => posting.id === cursor.id) + 1
    : 0;
  const result = withNextCursor(
    filtered.slice(cursorIndex, cursorIndex + limit + 1),
    limit,
  );
  return data({
    ...result,
    items: result.items.map((posting) =>
      mapPosting({
        ...posting,
        ...counts.get(posting.id),
      }),
    ),
  });
});

async function fetchAllPostings(
  supabase: ReturnType<typeof createCareersServiceClient>,
  filters: {
    employmentType: (typeof EMPLOYMENT_TYPES)[number] | null;
    field: string | null;
    keyword: string | null;
  },
) {
  const rows: PostingRow[] = [];
  let cursor: string | null = null;
  while (true) {
    let builder = supabase
      .from("job_postings")
      .select("*, cover_letter_questions(*)")
      .is("deleted_at", null)
      .order("id", { ascending: true })
      .limit(1_000);
    if (filters.employmentType)
      builder = builder.eq("employment_type", filters.employmentType);
    if (filters.field) builder = builder.eq("field", filters.field);
    if (filters.keyword)
      builder = builder.or(
        `title.ilike.%${filters.keyword}%,field.ilike.%${filters.keyword}%`,
      );
    if (cursor) builder = builder.gt("id", cursor);

    const { data: pageRows, error } = await builder;
    throwIfError(error);
    rows.push(...(pageRows ?? []));
    if (!pageRows || pageRows.length < 1_000) return rows;
    cursor = pageRows[pageRows.length - 1]!.id;
  }
}

type PostingRow = Record<string, unknown> & {
  id: string;
  created_at: string;
  updated_at: string;
  end_date: string | null;
};

export const POST = route(async (request: Request) => {
  const admin = await requireCareersAdmin();
  const body = await json(request);
  const posting = {
    title: text(body.title, "공고 제목", { required: true, max: 200 }),
    field: text(body.field ?? body.department, "모집 분야", {
      required: true,
      max: 100,
    }),
    careerType: oneOf(body.careerType, CAREER_TYPES, "경력 구분"),
    employmentType: oneOf(body.employmentType, EMPLOYMENT_TYPES, "고용 형태"),
    startDate: dateOnly(body.startDate, "게시 시작일"),
    endDate: dateOnly(body.endDate ?? body.closesAt, "게시 종료일"),
    isPublic: boolean(body.isPublic, false),
    description: text(body.description, "설명", { max: 50_000 }),
    content: text(body.content, "공고 본문", { max: 100_000 }) ?? "",
    coverLetterQuestions: coverLetterQuestions(body.coverLetterQuestions),
  };

  const { data: created, error } = await createCareersServiceClient().rpc(
    "create_job_posting_with_preset",
    {
      p_posting: posting,
      p_actor_admin_id: admin.id,
    },
  );
  throwIfError(error);
  if (!created) throw new ApiError("공고를 생성하지 못했습니다.", 500);
  return data(mapPosting(created), 201);
});

function dateOnly(value: unknown, label: string) {
  const result = text(value, label, { required: true, max: 10 });
  if (!result || !/^\d{4}-\d{2}-\d{2}$/.test(result)) {
    throw new ApiError(`${label} 값이 올바르지 않습니다.`, 400);
  }
  return result;
}

function coverLetterQuestions(value: unknown) {
  if (value == null) return [];
  if (!Array.isArray(value) || value.length > 20)
    throw new ApiError("자기소개서 문항은 20개까지 저장할 수 있습니다.", 400);
  return value.map((candidate) => {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate))
      throw new ApiError("자기소개서 문항 형식이 올바르지 않습니다.", 400);
    const row = candidate as Record<string, unknown>;
    const maxLength = row.maxLength == null ? undefined : Number(row.maxLength);
    if (
      maxLength !== undefined &&
      (!Number.isSafeInteger(maxLength) || maxLength < 1 || maxLength > 100_000)
    )
      throw new ApiError("문항 최대 글자 수가 올바르지 않습니다.", 400);
    return {
      id: typeof row.id === "string" && row.id ? row.id : crypto.randomUUID(),
      question: text(row.question, "자기소개서 문항", {
        required: true,
        max: 1_000,
      }),
      ...(maxLength ? { maxLength } : {}),
    };
  });
}
