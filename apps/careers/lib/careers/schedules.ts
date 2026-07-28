import { ApiError } from "@/lib/careers/http";
import { SCHEDULE_STATUSES } from "@/lib/types";
import { dateTime, oneOf, optionalUuid, text, uuid } from "@/lib/validation";

export function scheduleInput(body: Record<string, unknown>) {
  const startsAt = dateTime(body.startsAt, "시작 시각", true)!;
  const endsAt = dateTime(body.endsAt, "종료 시각", true)!;
  if (endsAt <= startsAt) {
    throw new ApiError("종료 시각은 시작 시각보다 늦어야 합니다.", 400);
  }

  return {
    application_id: uuid(body.applicationId, "지원 ID"),
    job_posting_id: uuid(body.postingId, "공고 ID"),
    stage_id: optionalUuid(body.stageId, "단계 ID"),
    title: text(body.title, "일정 제목", { required: true, max: 200 }),
    starts_at: startsAt,
    ends_at: endsAt,
    location: text(body.location, "장소", { max: 500 }),
    notes: text(body.note ?? body.notes, "메모", { max: 5_000 }),
    status: oneOf(body.status, SCHEDULE_STATUSES, "상태", "scheduled"),
  };
}
