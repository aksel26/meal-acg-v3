import { requireCareersAdmin } from "@/lib/auth";
import { ApiError, data, route, throwIfError } from "@/lib/careers/http";
import { mapPosting } from "@/lib/careers/mappers";
import { getPostingCounts } from "@/lib/careers/posting-counts";
import { createCareersServiceClient } from "@/lib/supabase/server";
import { CAREER_TYPES, EMPLOYMENT_TYPES } from "@/lib/types";
import { boolean, json, oneOf, text, uuid } from "@/lib/validation";

type Context = { params: Promise<{ id: string }> };

export const GET = route(async (_request: Request, context: Context) => {
  await requireCareersAdmin();
  const { id } = await context.params;
  const postingId = uuid(id);
  const supabase = createCareersServiceClient();
  const { data: posting, error } = await supabase
    .from("job_postings")
    .select(
      "*, cover_letter_questions(*), stages:job_posting_stages(*, statuses:stage_statuses(*), message_rules:stage_message_rules(*))",
    )
    .eq("id", postingId)
    .is("deleted_at", null)
    .maybeSingle();
  throwIfError(error);
  if (!posting) throw new ApiError("공고를 찾을 수 없습니다.", 404);
  const counts = await getPostingCounts(supabase, [postingId]);
  return data(mapPosting({ ...posting, ...counts.get(postingId) }));
});

export const PATCH = route(async (request: Request, context: Context) => {
  const admin = await requireCareersAdmin();
  const { id } = await context.params;
  const postingId = uuid(id);
  const body = await json(request);
  const supabase = createCareersServiceClient();
  const { data: before, error: beforeError } = await supabase
    .from("job_postings")
    .select("*, cover_letter_questions(*)")
    .eq("id", postingId)
    .is("deleted_at", null)
    .maybeSingle();
  throwIfError(beforeError);
  if (!before) throw new ApiError("공고를 찾을 수 없습니다.", 404);

  const updates: Record<string, unknown> = {};
  if ("title" in body)
    updates.title = text(body.title, "공고 제목", { required: true, max: 200 });
  if ("department" in body)
    updates.department = text(body.department, "부서", {
      required: true,
      max: 100,
    });
  if ("field" in body) {
    updates.field = text(body.field, "모집 분야", {
      required: true,
      max: 100,
    });
  }
  if ("careerType" in body)
    updates.careerType = oneOf(body.careerType, CAREER_TYPES, "경력 구분");
  if ("employmentType" in body)
    updates.employmentType = oneOf(
      body.employmentType,
      EMPLOYMENT_TYPES,
      "고용 형태",
    );
  if ("startDate" in body)
    updates.startDate = dateOnly(body.startDate, "게시 시작일");
  if ("endDate" in body)
    updates.endDate = dateOnly(body.endDate, "게시 종료일");
  if ("isPublic" in body) updates.isPublic = boolean(body.isPublic, false);
  if ("description" in body)
    updates.description = text(body.description, "설명", { max: 50_000 });
  if ("content" in body)
    updates.content = text(body.content, "공고 본문", { max: 100_000 }) ?? "";
  if ("coverLetterQuestions" in body)
    updates.coverLetterQuestions = coverLetterQuestions(
      body.coverLetterQuestions,
    );
  if (Object.keys(updates).length === 0) return data(mapPosting(before));

  const { data: posting, error } = await supabase.rpc(
    "update_job_posting_with_questions",
    {
      p_job_posting_id: postingId,
      p_posting: updates,
      p_actor_admin_id: admin.id,
    },
  );
  throwIfError(error);
  return data(mapPosting(posting));
});

function dateOnly(value: unknown, label: string) {
  const result = text(value, label, { required: true, max: 10 });
  if (!result || !/^\d{4}-\d{2}-\d{2}$/.test(result))
    throw new ApiError(`${label} 값이 올바르지 않습니다.`, 400);
  return result;
}

function coverLetterQuestions(value: unknown) {
  if (!Array.isArray(value) || value.length > 20)
    throw new ApiError("자기소개서 문항은 20개까지 저장할 수 있습니다.", 400);
  return value.map((candidate) => {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate))
      throw new ApiError("자기소개서 문항 형식이 올바르지 않습니다.", 400);
    const row = candidate as Record<string, unknown>;
    return {
      id: typeof row.id === "string" && row.id ? row.id : crypto.randomUUID(),
      question: text(row.question, "자기소개서 문항", {
        required: true,
        max: 1_000,
      }),
      ...(Number.isSafeInteger(row.maxLength) && Number(row.maxLength) > 0
        ? { maxLength: row.maxLength }
        : {}),
    };
  });
}

export const DELETE = route(async (_request: Request, context: Context) => {
  const admin = await requireCareersAdmin();
  const { id } = await context.params;
  const { data: posting, error } = await createCareersServiceClient().rpc(
    "delete_job_posting_cascade",
    {
      p_job_posting_id: uuid(id),
      p_actor_admin_id: admin.id,
    },
  );
  throwIfError(error);
  if (!posting) throw new ApiError("공고를 찾을 수 없습니다.", 404);
  return data({ ok: true });
});
