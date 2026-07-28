import {
  ValidationError,
  boolean,
  object,
  optionalUuid,
  text,
} from "@/lib/validation";

const MAX_STAGES = 20;
const MAX_STATUSES_PER_STAGE = 20;

export function postingProcess(value: unknown) {
  if (!Array.isArray(value) || value.length > MAX_STAGES) {
    throw new ValidationError(
      `전형 단계는 ${MAX_STAGES}개까지 저장할 수 있습니다.`,
    );
  }

  return value.map((stageValue, stageIndex) => {
    const stage = object(stageValue);
    if (
      !Array.isArray(stage.statuses) ||
      stage.statuses.length > MAX_STATUSES_PER_STAGE
    ) {
      throw new ValidationError(
        `단계별 상태는 ${MAX_STATUSES_PER_STAGE}개까지 저장할 수 있습니다.`,
      );
    }

    const statuses = stage.statuses;
    return {
      id: optionalUuid(stage.id, "단계 ID"),
      name: text(stage.name, "단계명", { required: true, max: 100 }),
      displayOrder: stageIndex,
      showOnCalendar: boolean(stage.showOnCalendar, false),
      isActive: boolean(stage.isActive, true),
      autoSend: autoSend(stage.autoSend),
      statuses: statuses.map((statusValue, statusIndex) => {
        const status = object(statusValue);
        return {
          id: optionalUuid(status.id, "상태 ID"),
          name: text(status.name, "상태명", { required: true, max: 100 }),
          displayOrder: statusIndex,
          color: text(status.color, "상태 색상", {
            required: true,
            max: 30,
          }),
          isDefault: statusIndex === 0,
          isCompletion: statusIndex === statuses.length - 1,
          hasDateInput: boolean(status.hasDateInput, true),
          isActive: boolean(status.isActive, true),
        };
      }),
    };
  });
}

function autoSend(value: unknown) {
  if (value == null) return null;
  const config = object(value);
  const channels = Array.isArray(config.channels)
    ? config.channels.filter(
        (channel): channel is "email" | "sms" =>
          channel === "email" || channel === "sms",
      )
    : [];
  return {
    enabled: boolean(config.enabled, false),
    channels,
    title: text(config.title, "메시지 제목", { max: 200 }) ?? "",
    body: text(config.body, "메시지 본문", { max: 10_000 }) ?? "",
  };
}
