import { requireCareersAdmin } from "@/lib/auth";
import { ApiError, data, route, throwIfError } from "@/lib/careers/http";
import { asRow } from "@/lib/careers/mappers";
import { renderMessageTemplate } from "@/lib/careers/parity";
import { createCareersServiceClient } from "@/lib/supabase/server";
import { ValidationError, json, oneOf, text, uuid } from "@/lib/validation";

type Context = { params: Promise<{ id: string }> };

export const POST = route(async (request: Request, context: Context) => {
  const admin = await requireCareersAdmin();
  const { id } = await context.params;
  const applicationId = uuid(id);
  const body = await json(request);
  const stageId = uuid(body.stageId, "단계 ID");
  const supabase = createCareersServiceClient();
  const [applicationResult, stageResult] = await Promise.all([
    supabase
      .from("applications")
      .select(
        "id,job_posting_id, applicant:applicants!inner(name,email,phone), posting:job_postings!inner(title,field)",
      )
      .eq("id", applicationId)
      .is("deleted_at", null)
      .maybeSingle(),
    supabase
      .from("job_posting_stages")
      .select(
        "id,job_posting_id,name,message_channels,message_subject_template,message_body_template",
      )
      .eq("id", stageId)
      .maybeSingle(),
  ]);
  throwIfError(applicationResult.error);
  throwIfError(stageResult.error);
  if (!applicationResult.data)
    throw new ApiError("지원 건을 찾을 수 없습니다.", 404);
  if (
    !stageResult.data ||
    stageResult.data.job_posting_id !== applicationResult.data.job_posting_id
  )
    throw new ApiError("전형 단계를 찾을 수 없습니다.", 404);

  const configuredChannels = channels(stageResult.data.message_channels);
  const selectedChannels =
    body.channels == null ? configuredChannels : channels(body.channels);
  if (selectedChannels.some((channel) => !configuredChannels.includes(channel)))
    throw new ApiError("단계에 설정되지 않은 발송 채널입니다.", 400);

  const applicant = asRow(applicationResult.data.applicant);
  const posting = asRow(applicationResult.data.posting);
  const variables = {
    지원자명: stringValue(applicant.name),
    포지션명: stringValue(posting.field || posting.title),
    전형단계명: stageResult.data.name,
    면접일시:
      text(body.interviewDateTime, "면접 일시", { max: 100 }) ?? undefined,
  };
  const subjectTemplate =
    text(
      body.subject ?? stageResult.data.message_subject_template,
      "발송 제목",
      { max: 200 },
    ) ?? "";
  const bodyTemplate =
    text(body.body ?? stageResult.data.message_body_template, "발송 내용", {
      max: 10_000,
    }) ?? "";
  assertMessageContent(subjectTemplate, bodyTemplate);
  const subject = renderMessageTemplate(subjectTemplate, variables);
  const messageBody = renderMessageTemplate(bodyTemplate, variables);
  const { data: result, error } = await supabase.rpc(
    "record_application_stage_message",
    {
      p_application_id: applicationId,
      p_stage_id: stageId,
      p_send: {
        sentAt: new Date().toISOString(),
        channels: selectedChannels,
        auto: false,
        subject,
        body: messageBody,
      },
      p_actor_id: admin.id,
    },
  );
  throwIfError(error);
  return data(result, 201);
});

function channels(value: unknown) {
  if (!Array.isArray(value) || value.length === 0)
    throw new ValidationError("발송 채널을 하나 이상 선택해야 합니다.");
  return Array.from(
    new Set(
      value.map((channel) =>
        oneOf(channel, ["email", "sms"] as const, "발송 채널"),
      ),
    ),
  );
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function assertMessageContent(subject: string, body: string) {
  if (!subject.trim() && !body.trim())
    throw new ValidationError("발송 제목 또는 내용 중 하나는 필수입니다.");
}
