import { requireCareersAdmin } from "@/lib/auth";
import { ApiError, data, route, throwIfError } from "@/lib/careers/http";
import {
  asRow,
  asRows,
  mapApplication,
  mapPosting,
  mapSchedule,
} from "@/lib/careers/mappers";
import { createCareersServiceClient } from "@/lib/supabase/server";
import { dateTime, json, text, uuid } from "@/lib/validation";

type Context = { params: Promise<{ id: string }> };
type DetailRow = ReturnType<typeof asRow>;

const DETAIL_SELECT =
  "*, applicant:applicants!inner(*), posting:job_postings(*, cover_letter_questions(*), stages:job_posting_stages(*, statuses:stage_statuses(*), message_rules:stage_message_rules(*))), stage:job_posting_stages!applications_current_stage_id_job_posting_id_fkey(*), stage_status:stage_statuses!applications_current_status_id_current_stage_id_fkey(*), stage_records:application_stage_records(*), cover_letter_answers:application_cover_letter_answers(*), final_result:application_final_results(*), separations:application_separations(*), stage_history:application_stage_history(*, from_stage:job_posting_stages!application_stage_history_from_stage_id_fkey(name), from_status:stage_statuses!application_stage_history_from_status_id_fkey(name), to_stage:job_posting_stages!application_stage_history_to_stage_id_fkey(name), to_status:stage_statuses!application_stage_history_to_status_id_fkey(name)), schedules:schedule_events(*, stage:job_posting_stages(*)), messages:message_history(*), files:applicant_files(*)";

export const GET = route(async (_request: Request, context: Context) => {
  await requireCareersAdmin();
  const { id } = await context.params;
  const { data: application, error } = await createCareersServiceClient()
    .from("applications")
    .select(DETAIL_SELECT)
    .eq("id", uuid(id))
    .is("deleted_at", null)
    .is("applicant.deleted_at", null)
    .maybeSingle();
  throwIfError(error);
  if (!application) throw new ApiError("지원 건을 찾을 수 없습니다.", 404);

  const base = mapApplication(application);
  const applicant = asRow(application.applicant);
  const finalResult = asRow(application.final_result);
  const separation = asRows(application.separations).find(
    (item) => !item.restored_at,
  );
  return data({
    ...base,
    applicantMemo: typeof applicant.notes === "string" ? applicant.notes : null,
    educations: Array.isArray(applicant.educations) ? applicant.educations : [],
    certificates: Array.isArray(applicant.certificates)
      ? applicant.certificates
      : [],
    careers: Array.isArray(applicant.career_entries)
      ? applicant.career_entries
      : [],
    activities: Array.isArray(applicant.activities) ? applicant.activities : [],
    statisticsPackages: Array.isArray(applicant.statistics_packages)
      ? applicant.statistics_packages
      : [],
    thesis:
      applicant.thesis &&
      typeof applicant.thesis === "object" &&
      !Array.isArray(applicant.thesis)
        ? applicant.thesis
        : null,
    coverLetter: asRows(application.cover_letter_answers).map((answer) => ({
      questionId: answer.question_id,
      questionSnapshot: answer.question_snapshot,
      answer: answer.answer,
    })),
    finalResult: finalResult.id
      ? {
          result: finalResult.result,
          reason: finalResult.note,
          decidedAt: finalResult.decided_at,
        }
      : null,
    stageHistory: asRows(application.stage_history)
      .sort((left, right) =>
        compareTimestampRows(left, right, "changed_at", "desc"),
      )
      .map((item) => ({
        id: item.id,
        fromStageName: asRow(item.from_stage).name ?? null,
        fromStatusName: asRow(item.from_status).name ?? null,
        toStageName: asRow(item.to_stage).name ?? null,
        toStatusName: asRow(item.to_status).name ?? null,
        reason: item.reason,
        changedAt: item.changed_at,
      })),
    schedules: asRows(application.schedules)
      .filter((item) => !item.deleted_at)
      .sort((left, right) =>
        compareTimestampRows(left, right, "starts_at", "asc"),
      )
      .map((schedule) =>
        mapSchedule({
          ...schedule,
          application: { applicant: application.applicant },
          posting: application.posting,
        }),
      ),
    messages: asRows(application.messages)
      .sort((left, right) =>
        compareTimestampRows(left, right, "recorded_at", "desc"),
      )
      .map((item) => ({
        id: item.id,
        channel: item.channel,
        recipient: item.recipient,
        subject: item.subject,
        body: item.body,
        status: item.delivery_mode,
        createdAt: item.recorded_at,
      })),
    files: asRows(application.files)
      .filter((item) => !item.deleted_at)
      .sort((left, right) =>
        compareTimestampRows(left, right, "uploaded_at", "desc"),
      )
      .map((item) => ({
        id: item.id,
        originalName: item.original_filename,
        sizeBytes: item.size_bytes,
        mimeType: item.mime_type,
        createdAt: item.uploaded_at,
      })),
    separation: separation
      ? {
          reason: separation.reason,
          separatedAt: separation.separated_at,
          snapshot: separation.snapshot,
        }
      : null,
    posting: mapPosting(application.posting),
  });
});

function compareTimestampRows(
  left: DetailRow,
  right: DetailRow,
  field: string,
  direction: "asc" | "desc",
) {
  const leftTimestamp = typeof left[field] === "string" ? left[field] : "";
  const rightTimestamp = typeof right[field] === "string" ? right[field] : "";
  const timestampOrder =
    leftTimestamp < rightTimestamp
      ? -1
      : leftTimestamp > rightTimestamp
        ? 1
        : 0;
  const leftId = typeof left.id === "string" ? left.id : "";
  const rightId = typeof right.id === "string" ? right.id : "";
  const idOrder = leftId < rightId ? -1 : leftId > rightId ? 1 : 0;
  return direction === "asc"
    ? timestampOrder || idOrder
    : -timestampOrder || -idOrder;
}

export const PATCH = route(async (request: Request, context: Context) => {
  const admin = await requireCareersAdmin();
  const { id } = await context.params;
  const applicationId = uuid(id);
  const body = await json(request);
  const supabase = createCareersServiceClient();
  const applicantUpdates: Record<string, unknown> = {};
  if ("name" in body)
    applicantUpdates.name = text(body.name, "이름", {
      required: true,
      max: 100,
    });
  if ("email" in body)
    applicantUpdates.email = text(body.email, "이메일", {
      max: 320,
    });
  if ("phone" in body)
    applicantUpdates.phone = text(body.phone, "전화번호", {
      max: 30,
    });
  if ("source" in body)
    applicantUpdates.source = text(body.source, "유입 경로", { max: 100 });
  if ("memo" in body)
    applicantUpdates.notes = text(body.memo, "메모", { max: 10_000 });
  for (const [clientKey, databaseKey] of [
    ["platform", "platform"],
    ["gender", "gender"],
    ["birthDate", "birthDate"],
    ["region", "region"],
    ["regionDetail", "regionDetail"],
    ["address", "address"],
    ["educations", "educations"],
    ["certificates", "certificates"],
    ["careers", "careerEntries"],
    ["activities", "activities"],
    ["statisticsPackages", "statisticsPackages"],
    ["thesis", "thesis"],
    ["submissionStatus", "submissionStatus"],
  ] as const) {
    if (clientKey in body) applicantUpdates[databaseKey] = body[clientKey];
  }

  const applicationUpdates: Record<string, unknown> = {};
  if ("postingId" in body)
    applicationUpdates.jobPostingId = uuid(body.postingId, "공고 ID");
  if ("appliedAt" in body)
    applicationUpdates.appliedAt = dateTime(body.appliedAt, "지원 시각", true);
  if ("coverLetter" in body) {
    const { data: current, error: currentError } = await supabase
      .from("applications")
      .select("job_posting_id")
      .eq("id", applicationId)
      .single();
    throwIfError(currentError);
    if (!current) throw new ApiError("지원 건을 찾을 수 없습니다.", 404);
    const { data: questions, error: questionsError } = await supabase
      .from("cover_letter_questions")
      .select("id, question")
      .eq(
        "job_posting_id",
        typeof applicationUpdates.jobPostingId === "string"
          ? applicationUpdates.jobPostingId
          : current.job_posting_id,
      )
      .eq("is_active", true);
    throwIfError(questionsError);
    const questionById = new Map(
      (questions ?? []).map((question) => [question.id, question.question]),
    );
    if (!Array.isArray(body.coverLetter))
      throw new ApiError("자기소개서 답변 형식이 올바르지 않습니다.", 400);
    applicationUpdates.coverLetter = body.coverLetter.map((value) => {
      const answer = asRow(value);
      const questionId = uuid(answer.questionId, "자기소개서 문항 ID");
      const question = questionById.get(questionId);
      if (!question)
        throw new ApiError("자기소개서 문항을 찾을 수 없습니다.", 400);
      return {
        questionId,
        question,
        answer:
          text(answer.answer, "자기소개서 답변", {
            max: 100_000,
          }) ?? "",
      };
    });
  }
  if (
    Object.keys(applicantUpdates).length === 0 &&
    Object.keys(applicationUpdates).length === 0
  ) {
    throw new ApiError("변경할 값이 없습니다.", 400);
  }
  const { data: updated, error } = await supabase.rpc("update_application", {
    p_application_id: applicationId,
    p_applicant: applicantUpdates,
    p_application: applicationUpdates,
    p_actor_id: admin.id,
  });
  throwIfError(error);
  return data(updated);
});

export const DELETE = route(async (_request: Request, context: Context) => {
  const admin = await requireCareersAdmin();
  const { id } = await context.params;
  const applicationId = uuid(id);
  const supabase = createCareersServiceClient();
  const { data: application, error } = await supabase.rpc(
    "delete_application",
    {
      p_application_id: applicationId,
      p_actor_admin_id: admin.id,
    },
  );
  throwIfError(error);
  if (!application) throw new ApiError("지원 건을 찾을 수 없습니다.", 404);
  return data({ ok: true });
});
