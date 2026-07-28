import {
  derivePostingStatus,
  resolveSeparatedStage,
} from "@/lib/careers/parity";

export { resolveSeparatedStage } from "@/lib/careers/parity";

type Row = Record<string, unknown>;

function isRow(value: unknown): value is Row {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function asRow(value: unknown): Row {
  return isRow(value) ? value : {};
}

export function asRows(value: unknown): Row[] {
  return Array.isArray(value) ? value.filter(isRow) : [];
}

function string(value: unknown) {
  return typeof value === "string" ? value : "";
}

function nullableString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function number(value: unknown) {
  return typeof value === "number" ? value : 0;
}

function bool(value: unknown) {
  return value === true;
}

function jsonArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function aggregateCount(value: unknown) {
  const count = asRows(value)[0]?.count;
  return typeof count === "number" ? count : undefined;
}

function compareDisplayOrder(left: Row, right: Row) {
  return (
    number(left.display_order) - number(right.display_order) ||
    string(left.id).localeCompare(string(right.id))
  );
}

export function mapStatus(row: Row) {
  return {
    id: string(row.id),
    name: string(row.name),
    color: string(row.color) || "gray",
    isDefault: bool(row.is_default),
    isCompletion: bool(row.is_completion),
    hasDateInput: row.has_date_input !== false,
    resultMeaning: string(row.result_meaning) || "neutral",
    isTerminal: bool(row.is_completion || row.is_terminal),
    isActive: bool(row.is_active),
    displayOrder: number(row.display_order),
  };
}

export function mapStage(row: Row) {
  const messageRules = asRows(row.message_rules);
  return {
    id: string(row.id),
    name: string(row.name),
    type: string(row.stage_type),
    displayOrder: number(row.display_order),
    showOnCalendar: bool(row.show_on_calendar),
    isActive: bool(row.is_active),
    statuses: asRows(row.statuses)
      .filter((status) => status.is_active === true)
      .sort(compareDisplayOrder)
      .map((status) => {
        const mapped = mapStatus(status);
        const rule = messageRules.find((item) => item.status_id === status.id);
        return {
          ...mapped,
          messageRule: rule
            ? {
                id: string(rule.id),
                isActive: bool(rule.is_active),
                subjectTemplate: string(rule.subject_template),
                bodyTemplate: string(rule.body_template),
              }
            : null,
        };
      }),
    autoSend: {
      enabled: bool(row.message_enabled),
      channels: jsonArray(row.message_channels).filter(
        (channel) => channel === "email" || channel === "sms",
      ),
      title: string(row.message_subject_template),
      body: string(row.message_body_template),
    },
  };
}

export function mapPosting(row: Row) {
  const endDate = nullableString(row.end_date || row.closes_at);
  return {
    id: string(row.id),
    title: string(row.title),
    department: string(row.department),
    field: string(row.field || row.department),
    careerType: string(row.career_type) || "신입",
    employmentType: string(row.employment_type),
    startDate:
      nullableString(row.start_date || row.published_at)?.slice(0, 10) ?? "",
    endDate: endDate?.slice(0, 10) ?? "",
    isPublic: bool(row.is_public),
    content: string(row.content),
    coverLetterQuestions: asRows(row.cover_letter_questions)
      .filter((question) => question.is_active !== false)
      .sort(compareDisplayOrder)
      .map((question) => ({
        id: string(question.id),
        question: string(question.question),
        ...(number(question.max_length)
          ? { maxLength: number(question.max_length) }
          : {}),
      })),
    headcount: number(row.headcount),
    description: string(row.description),
    status: string(row.status),
    derivedStatus: derivePostingStatus(endDate),
    publishedAt: nullableString(row.published_at),
    closesAt: nullableString(row.closes_at),
    applicantCount:
      typeof row.applicant_count === "number"
        ? row.applicant_count
        : aggregateCount(row.applications),
    activeApplicantCount:
      typeof row.active_applicant_count === "number"
        ? row.active_applicant_count
        : aggregateCount(row.active_applications),
    separatedApplicantCount:
      typeof row.separated_applicant_count === "number"
        ? row.separated_applicant_count
        : aggregateCount(row.separated_applications),
    upcomingScheduleCount: number(row.upcoming_schedule_count),
    hiredCount: number(row.hired_count),
    stages: Array.isArray(row.stages)
      ? asRows(row.stages)
          .filter((stage) => stage.is_active === true)
          .sort(compareDisplayOrder)
          .map(mapStage)
      : undefined,
    createdBy: string(asRow(row.created_by_member).full_name || row.created_by),
    updatedBy: string(asRow(row.updated_by_member).full_name || row.updated_by),
    createdAt: string(row.created_at),
    updatedAt: string(row.updated_at),
  };
}

export function mapApplication(row: Row) {
  const applicant = asRow(row.applicant);
  const posting = asRow(row.posting);
  const stage = asRow(row.stage);
  const stageStatus = asRow(row.stage_status);
  const separation = asRows(row.separations).find((item) => !item.restored_at);
  const finalResult = asRow(
    Array.isArray(row.final_result)
      ? asRows(row.final_result)[0]
      : row.final_result,
  );

  return {
    id: string(row.id),
    applicantId: string(row.applicant_id),
    applicantName: string(applicant.name),
    email: string(applicant.email),
    phone: string(applicant.phone),
    source: nullableString(applicant.source),
    no: number(row.display_no),
    platform: string(applicant.platform),
    gender: string(applicant.gender) || "남성",
    birthDate: nullableString(applicant.birth_date)?.slice(0, 10) ?? "",
    region: string(applicant.region),
    regionDetail: string(applicant.region_detail),
    address: string(applicant.address),
    submissionStatus: string(applicant.submission_status) || "미완료",
    memo: nullableString(applicant.notes),
    postingId: string(row.job_posting_id),
    postingTitle: string(posting.title),
    department: string(posting.department),
    field: string(posting.field || posting.department),
    stageId: nullableString(row.current_stage_id),
    stageName: nullableString(stage.name),
    statusId: nullableString(row.current_status_id),
    statusName: nullableString(stageStatus.name),
    applicationStatus: string(row.status),
    appliedAt: string(row.applied_at),
    separatedAt: nullableString(separation?.separated_at),
    separatedReason: nullableString(separation?.reason),
    finalResult: finalResult.id
      ? {
          result: finalResult.result,
          reason: nullableString(finalResult.note),
          decidedAt: string(finalResult.decided_at),
        }
      : null,
    stageRecords: asRows(row.stage_records).map(mapStageRecord),
    posting:
      posting.id && Array.isArray(posting.stages)
        ? mapPosting(posting)
        : undefined,
  };
}

export function mapStageRecord(row: Row) {
  const meta = {
    ...(row.start_date ? { startDate: string(row.start_date) } : {}),
    ...(row.end_date ? { endDate: string(row.end_date) } : {}),
    ...(row.event_time ? { time: string(row.event_time).slice(0, 5) } : {}),
    ...(row.note ? { note: string(row.note) } : {}),
    ...(row.send_meta ? { send: row.send_meta } : {}),
  };
  return {
    stageId: string(row.stage_id),
    statusId: string(row.status_id),
    meta: Object.keys(meta).length ? meta : undefined,
    updatedAt: string(row.updated_at),
  };
}

export function mapSeparatedApplication(row: Row) {
  const current = mapApplication(row);
  const separation = asRows(row.separations).find((item) => !item.restored_at);
  const snapshot = asRow(separation?.snapshot);
  const application = asRow(snapshot.application);
  const applicant = asRow(snapshot.applicant);
  const posting = asRow(snapshot.jobPosting);
  const stage = asRow(snapshot.stage);
  const stages = current.posting?.stages || [];
  const stageRecords = current.stageRecords || [];
  const resolvedStage = resolveSeparatedStage(
    string(stage.id || application.current_stage_id) || null,
    stageRecords,
    stages,
  );
  const resolvedRecord = resolvedStage
    ? stageRecords.find((record) => record.stageId === resolvedStage.id)
    : undefined;
  const resolvedStatus = resolvedStage
    ? resolvedStage.statuses.find(
        (status) => status.id === resolvedRecord?.statusId,
      ) ||
      resolvedStage.statuses.find((status) => status.isDefault) ||
      resolvedStage.statuses[0]
    : undefined;

  return {
    ...current,
    id: string(application.id || row.id),
    applicantId: string(
      applicant.id || application.applicant_id || row.applicant_id,
    ),
    applicantName: string(applicant.name) || current.applicantName,
    email: string(applicant.email) || current.email,
    phone: string(applicant.phone) || current.phone,
    source: nullableString(applicant.source) ?? current.source,
    memo: nullableString(applicant.notes) ?? current.memo,
    postingId: string(
      posting.id || application.job_posting_id || row.job_posting_id,
    ),
    postingTitle: string(posting.title) || current.postingTitle,
    department: string(posting.department) || current.department,
    field: string(posting.field) || current.field,
    stageId: resolvedStage?.id || current.stageId,
    stageName: resolvedStage?.name || current.stageName,
    statusId: resolvedStatus?.id || current.statusId,
    statusName: resolvedStatus?.name || current.statusName,
    applicationStatus: "separated" as const,
    appliedAt: string(application.applied_at || row.applied_at),
    separatedAt: nullableString(separation?.separated_at),
    separatedReason: nullableString(separation?.reason),
    separationSnapshot: snapshot,
  };
}

export function mapSchedule(row: Row) {
  const application = asRow(row.application);
  const posting = asRow(row.posting);
  return {
    id: string(row.id),
    applicationId: string(row.application_id),
    postingId: string(row.job_posting_id),
    stageId: nullableString(row.stage_id),
    applicantName: nullableString(asRow(application.applicant).name),
    postingTitle: nullableString(
      posting.title || asRow(application.posting).title,
    ),
    stageName: nullableString(asRow(row.stage).name),
    title: string(row.title),
    startsAt: string(row.starts_at),
    endsAt: nullableString(row.ends_at),
    location: nullableString(row.location),
    note: nullableString(row.notes),
    status: string(row.status),
    bucket: nullableString(row.bucket) ?? undefined,
    date: nullableString(row.date) ?? undefined,
    time: nullableString(row.time) ?? undefined,
  };
}
