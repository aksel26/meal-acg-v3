import { requireCareersAdmin } from "@/lib/auth";
import { ApiError, data, route, throwIfError } from "@/lib/careers/http";
import { asRow } from "@/lib/careers/mappers";
import {
  hasStageStatusChanged,
  renderMessageTemplate,
  resolveTransitionMessageAction,
} from "@/lib/careers/parity";
import { createCareersServiceClient } from "@/lib/supabase/server";
import {
  ValidationError,
  boolean,
  json,
  object,
  oneOf,
  text,
  uuid,
} from "@/lib/validation";

type Context = { params: Promise<{ id: string }> };
type TransitionMeta = {
  startDate?: string;
  endDate?: string;
  time?: string;
  note?: string;
  send?: {
    sentAt: string;
    channels: Array<"email" | "sms">;
    auto: boolean;
    subject: string;
    body: string;
  };
};

export const POST = route(async (request: Request, context: Context) => {
  const admin = await requireCareersAdmin();
  const { id } = await context.params;
  const body = await json(request);
  const applicationId = uuid(id);
  const stageId = uuid(body.stageId, "단계 ID");
  const statusId = uuid(body.statusId, "상태 ID");
  const parsedMeta = stageMeta(body.meta);
  const { send: requestedSend, ...recordMeta } = parsedMeta;
  const meta: TransitionMeta = recordMeta;
  const sendIntent = oneOf(
    body.sendIntent,
    ["auto", "manual", "preserve"] as const,
    "발송 동작",
    "preserve",
  );
  const supabase = createCareersServiceClient();

  const [applicationResult, stageResult, statusResult, stageRecordResult] =
    await Promise.all([
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
          "id,job_posting_id,name,message_enabled,message_channels,message_subject_template,message_body_template",
        )
        .eq("id", stageId)
        .maybeSingle(),
      supabase
        .from("stage_statuses")
        .select("id,stage_id,has_date_input")
        .eq("id", statusId)
        .maybeSingle(),
      supabase
        .from("application_stage_records")
        .select("status_id")
        .eq("application_id", applicationId)
        .eq("stage_id", stageId)
        .maybeSingle(),
    ]);
  throwIfError(applicationResult.error);
  throwIfError(stageResult.error);
  throwIfError(statusResult.error);
  throwIfError(stageRecordResult.error);
  if (!applicationResult.data)
    throw new ApiError("지원 건을 찾을 수 없습니다.", 404);
  if (
    !stageResult.data ||
    stageResult.data.job_posting_id !== applicationResult.data.job_posting_id ||
    statusResult.data?.stage_id !== stageId
  )
    throw new ApiError("전형 단계 또는 상태를 찾을 수 없습니다.", 404);
  const statusChanged = hasStageStatusChanged(
    stageRecordResult.data?.status_id,
    statusId,
  );
  const messageAction = resolveTransitionMessageAction({
    intent: sendIntent,
    statusChanged,
    hasSendPayload: Boolean(requestedSend),
  });
  if (messageAction === "invalid")
    throw new ApiError("수동 발송 정보가 필요합니다.", 400);
  const applicant = asRow(applicationResult.data.applicant);
  const posting = asRow(applicationResult.data.posting);
  const interviewDateTime = [meta.endDate, meta.time].filter(Boolean).join(" ");
  const variables = {
    지원자명: stringValue(applicant.name),
    포지션명: stringValue(posting.field || posting.title),
    전형단계명: stageResult.data.name,
    면접일시: interviewDateTime || undefined,
  };

  if (messageAction === "manual" || messageAction === "auto") {
    const configuredChannels = normalizeChannels(
      stageResult.data.message_channels,
      false,
    );
    if (configuredChannels.length === 0)
      throw new ApiError("단계 발송 채널 설정이 비어 있습니다.", 409);
    if (
      requestedSend?.channels.some(
        (channel) => !configuredChannels.includes(channel),
      )
    )
      throw new ApiError("단계에 설정되지 않은 발송 채널입니다.", 400);
    if (messageAction === "manual" && requestedSend?.auto)
      throw new ApiError("수동 발송 정보가 올바르지 않습니다.", 400);
    if (
      messageAction === "auto" &&
      (!stageResult.data.message_enabled ||
        !statusResult.data.has_date_input ||
        body.meta == null ||
        requestedSend?.auto === false)
    )
      throw new ApiError("자동 발송 조건이 충족되지 않았습니다.", 400);
  }

  if (messageAction === "manual" && requestedSend) {
    meta.send = renderSend(requestedSend, variables);
  }
  if (messageAction === "auto") {
    if (
      !requestedSend &&
      !stageResult.data.message_subject_template.trim() &&
      !stageResult.data.message_body_template.trim()
    )
      throw new ApiError("단계 발송 템플릿이 비어 있습니다.", 409);
    const configuredChannels = normalizeChannels(
      stageResult.data.message_channels,
      false,
    );
    meta.send = requestedSend
      ? renderSend({ ...requestedSend, auto: true }, variables)
      : {
          sentAt: new Date().toISOString(),
          channels: configuredChannels,
          auto: true,
          subject: renderMessageTemplate(
            stageResult.data.message_subject_template,
            variables,
          ),
          body: renderMessageTemplate(
            stageResult.data.message_body_template,
            variables,
          ),
        };
  }

  const { data: application, error } = await supabase.rpc(
    "transition_application_stage",
    {
      p_application_id: applicationId,
      p_stage_id: stageId,
      p_status_id: statusId,
      p_actor_id: admin.id,
      p_reason: text(body.reason, "변경 사유", { max: 2_000 }),
      p_meta: meta,
    },
  );
  throwIfError(error);
  return data(application);
});

function stageMeta(value: unknown): TransitionMeta {
  if (value == null) return {};
  const meta = object(value);
  return {
    startDate: date(meta.startDate, "시작일"),
    endDate: date(meta.endDate, "종료일"),
    time: time(meta.time),
    note: text(meta.note, "일정 메모", { max: 5_000 }) ?? undefined,
    send: meta.send == null ? undefined : sendMeta(meta.send),
  };
}

function renderSend(
  send: ReturnType<typeof sendMeta>,
  variables: Record<string, string | undefined>,
) {
  return {
    ...send,
    subject: renderMessageTemplate(send.subject, variables),
    body: renderMessageTemplate(send.body, variables),
  };
}

function sendMeta(value: unknown) {
  const send = object(value);
  const sentAt = text(send.sentAt, "발송 시각", {
    required: true,
    max: 64,
  })!;
  if (Number.isNaN(Date.parse(sentAt)))
    throw new ValidationError("발송 시각 값이 올바르지 않습니다.");
  const subject = text(send.subject, "발송 제목", { max: 200 }) ?? "";
  const body = text(send.body, "발송 내용", { max: 10_000 }) ?? "";
  if (!subject.trim() && !body.trim())
    throw new ValidationError("발송 제목 또는 내용 중 하나는 필수입니다.");
  return {
    sentAt: new Date(sentAt).toISOString(),
    channels: normalizeChannels(send.channels),
    auto: boolean(send.auto, false),
    subject,
    body,
  };
}

function normalizeChannels(value: unknown, required = true) {
  if (!Array.isArray(value) || (required && value.length === 0))
    throw new ValidationError("발송 채널을 하나 이상 선택해야 합니다.");
  return Array.from(
    new Set(
      value.map((channel) =>
        oneOf(channel, ["email", "sms"] as const, "발송 채널"),
      ),
    ),
  );
}

function date(value: unknown, label: string) {
  const result = text(value, label, { max: 10 });
  if (result && !/^\d{4}-\d{2}-\d{2}$/.test(result))
    throw new ValidationError(`${label} 값이 올바르지 않습니다.`);
  return result ?? undefined;
}

function time(value: unknown) {
  const result = text(value, "시간", { max: 5 });
  if (result && !/^\d{2}:\d{2}$/.test(result))
    throw new ValidationError("시간 값이 올바르지 않습니다.");
  return result ?? undefined;
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : undefined;
}
