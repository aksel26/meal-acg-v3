import { requireCareersAdmin } from "@/lib/auth";
import { ApiError, data, query, route, throwIfError } from "@/lib/careers/http";
import { mapApplication } from "@/lib/careers/mappers";
import { page, withNextCursor } from "@/lib/careers/pagination";
import { createCareersServiceClient } from "@/lib/supabase/server";
import { APPLICANT_SORTS, GENDERS, SUBMISSION_STATUSES } from "@/lib/types";
import {
  dateTime,
  json,
  oneOf,
  optionalUuid,
  searchTerm,
  text,
  uuid,
} from "@/lib/validation";

const SUMMARY_SELECT =
  "*, applicant:applicants!inner(*), posting:job_postings!inner(*, cover_letter_questions(*), stages:job_posting_stages(*, statuses:stage_statuses(*))), stage:job_posting_stages!applications_current_stage_id_job_posting_id_fkey(*), stage_status:stage_statuses!applications_current_status_id_current_stage_id_fkey(*), final_result:application_final_results(*), stage_records:application_stage_records(*)";
const FETCH_PAGE_SIZE = 1_000;

export const GET = route(async (request: Request) => {
  await requireCareersAdmin();
  const search = query(request);
  const { limit, cursor } = page(search);
  const supabase = createCareersServiceClient();
  const postingId = search.get("postingId")
    ? uuid(search.get("postingId"), "공고 ID")
    : null;
  const stageId = search.get("stageId")
    ? uuid(search.get("stageId"), "단계 ID")
    : null;
  const statusId = search.get("statusId")
    ? uuid(search.get("statusId"), "상태 ID")
    : null;
  const field = searchTerm(search.get("field"));
  const keyword = searchTerm(search.get("search"));
  const rows: ApplicationSummaryRow[] = [];
  let fetchCursor: string | null = null;
  while (true) {
    let builder = supabase
      .from("applications")
      .select(SUMMARY_SELECT)
      .in("status", ["active", "completed"])
      .is("deleted_at", null)
      .is("applicant.deleted_at", null)
      .order("id", { ascending: true })
      .limit(FETCH_PAGE_SIZE);
    if (postingId) builder = builder.eq("job_posting_id", postingId);
    if (stageId) builder = builder.eq("current_stage_id", stageId);
    if (statusId) builder = builder.eq("current_status_id", statusId);
    if (field) builder = builder.eq("posting.field", field);
    if (keyword) {
      builder = builder.or(
        `name.ilike.%${keyword}%,email.ilike.%${keyword}%,phone.ilike.%${keyword}%,notes.ilike.%${keyword}%`,
        { referencedTable: "applicants" },
      );
    }
    if (fetchCursor) builder = builder.gt("id", fetchCursor);

    const { data: pageRows, error } = await builder;
    throwIfError(error);
    rows.push(...(pageRows ?? []));
    if (!pageRows || pageRows.length < FETCH_PAGE_SIZE) break;
    fetchCursor = pageRows[pageRows.length - 1]!.id;
  }

  const sort = oneOf(search.get("sort"), APPLICANT_SORTS, "정렬", "newest");
  const sorted = [...rows].sort((left, right) => {
    if (sort === "oldest")
      return String(left.applied_at).localeCompare(String(right.applied_at));
    if (sort === "name")
      return String(
        (left.applicant as { name?: unknown } | null)?.name ?? "",
      ).localeCompare(
        String((right.applicant as { name?: unknown } | null)?.name ?? ""),
        "ko",
      );
    return String(right.applied_at).localeCompare(String(left.applied_at));
  });
  const cursorIndex = cursor
    ? sorted.findIndex((application) => application.id === cursor.id) + 1
    : 0;
  const result = withNextCursor(
    sorted.slice(cursorIndex, cursorIndex + limit + 1),
    limit,
  );
  return data({ ...result, items: result.items.map(mapApplication) });
});

type ApplicationSummaryRow = Record<string, unknown> & {
  id: string;
  created_at: string;
  applied_at: string;
};

export const POST = route(async (request: Request) => {
  const admin = await requireCareersAdmin();
  const body = await json(request);
  const supabase = createCareersServiceClient();
  const postingId = uuid(body.postingId, "공고 ID");
  const coverLetter = await coverLetterAnswers(
    supabase,
    postingId,
    body.coverLetter,
  );
  const existingApplicantId = optionalUuid(body.applicantId, "지원자 ID");
  const applicant = existingApplicantId
    ? { id: existingApplicantId }
    : {
        no:
          Number.isSafeInteger(body.no) && Number(body.no) > 0
            ? Number(body.no)
            : null,
        name: text(body.name, "이름", { required: true, max: 100 }),
        platform: text(body.platform, "지원 플랫폼", { max: 100 }) ?? "",
        gender: oneOf(body.gender, GENDERS, "성별"),
        birthDate: dateOnly(body.birthDate, "생년월일", false),
        email: text(body.email, "이메일", { max: 320 }),
        phone: text(body.phone, "전화번호", { max: 30 }),
        region: text(body.region, "지역", { max: 100 }) ?? "",
        regionDetail: text(body.regionDetail, "상세 지역", { max: 200 }) ?? "",
        address: text(body.address, "주소", { max: 500 }) ?? "",
        educations: jsonArray(body.educations, "학력"),
        certificates: jsonArray(body.certificates, "자격증"),
        careerEntries: jsonArray(body.careers, "경력"),
        activities: jsonArray(body.activities, "활동"),
        statisticsPackages: jsonArray(body.statisticsPackages, "통계 패키지"),
        thesis: jsonObject(body.thesis, "논문"),
        submissionStatus: oneOf(
          body.submissionStatus,
          SUBMISSION_STATUSES,
          "제출 상태",
          "미완료",
        ),
        source: text(body.source, "유입 경로", { max: 100 }),
        notes: text(body.memo, "메모", { max: 10_000 }),
      };
  const { data: application, error } = await supabase.rpc(
    "create_application",
    {
      p_applicant: applicant,
      p_application: {
        jobPostingId: postingId,
        currentStageId: optionalUuid(body.stageId, "단계 ID"),
        currentStatusId: optionalUuid(body.statusId, "상태 ID"),
        status: "active",
        appliedAt:
          dateTime(body.appliedAt, "지원 시각") ?? new Date().toISOString(),
        coverLetter,
      },
      p_actor_id: admin.id,
    },
  );
  throwIfError(error);
  if (!application) throw new ApiError("지원 건을 생성하지 못했습니다.", 500);

  const { data: created, error: detailError } = await supabase
    .from("applications")
    .select(SUMMARY_SELECT)
    .eq("id", application.id)
    .single();
  throwIfError(detailError);
  if (!created) throw new ApiError("지원 건을 찾을 수 없습니다.", 404);
  return data(mapApplication(created), 201);
});

function dateOnly(value: unknown, label: string, required = true) {
  const result = text(value, label, { required, max: 10 });
  if (result && !/^\d{4}-\d{2}-\d{2}$/.test(result))
    throw new ApiError(`${label} 값이 올바르지 않습니다.`, 400);
  return result ?? "";
}

function jsonArray(value: unknown, label: string) {
  if (value == null) return [];
  if (!Array.isArray(value) || value.length > 100)
    throw new ApiError(`${label} 형식이 올바르지 않습니다.`, 400);
  return value;
}

function jsonObject(value: unknown, label: string) {
  if (value == null) return null;
  if (typeof value !== "object" || Array.isArray(value))
    throw new ApiError(`${label} 형식이 올바르지 않습니다.`, 400);
  return value;
}

async function coverLetterAnswers(
  supabase: ReturnType<typeof createCareersServiceClient>,
  postingId: string,
  value: unknown,
) {
  const answers = jsonArray(value, "자기소개서");
  if (!answers.length) return [];
  const { data: questions, error } = await supabase
    .from("cover_letter_questions")
    .select("id, question")
    .eq("job_posting_id", postingId)
    .eq("is_active", true);
  throwIfError(error);
  const questionById = new Map(
    (questions ?? []).map((question) => [question.id, question.question]),
  );
  return answers.map((answerValue) => {
    if (
      !answerValue ||
      typeof answerValue !== "object" ||
      Array.isArray(answerValue)
    )
      throw new ApiError("자기소개서 답변 형식이 올바르지 않습니다.", 400);
    const answer = answerValue as Record<string, unknown>;
    const questionId = uuid(answer.questionId, "자기소개서 문항 ID");
    const question = questionById.get(questionId);
    if (!question)
      throw new ApiError("자기소개서 문항을 찾을 수 없습니다.", 400);
    return {
      questionId,
      question,
      answer: text(answer.answer, "자기소개서 답변", { max: 100_000 }) ?? "",
    };
  });
}
