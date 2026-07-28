"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query";

export type PostingStatus = "draft" | "open" | "closed";
export type ResultMeaning = "neutral" | "pass" | "fail";
export type ScheduleStatus = "scheduled" | "completed" | "cancelled";
export type PostingDerivedStatus = "진행중" | "종료";
export type CareerType = "신입" | "경력";
export type EmploymentType = "정규직" | "계약직" | "인턴";
export type Gender = "남성" | "여성";
export type SubmissionStatus = "완료" | "미완료";
export type PostingSort =
  | "deadlineAsc"
  | "createdDesc"
  | "createdAsc"
  | "updatedDesc"
  | "applicantsDesc"
  | "applicantsAsc"
  | "statusFirst";
export type ApplicantSort = "newest" | "oldest" | "name";
export type SeparatedSort =
  | "recentSeparated"
  | "oldestSeparated"
  | "applicationNewest";

export interface CoverLetterQuestion {
  id: string;
  question: string;
  maxLength?: number;
}

export interface AutoSendConfig {
  enabled: boolean;
  channels: Array<"email" | "sms">;
  title: string;
  body: string;
}

export interface StageStatus {
  id: string;
  name: string;
  color: string;
  isDefault: boolean;
  isCompletion: boolean;
  hasDateInput: boolean;
  /** @deprecated retained only while existing screens migrate. */
  resultMeaning?: ResultMeaning;
  /** @deprecated use isCompletion. */
  isTerminal?: boolean;
  isActive: boolean;
  displayOrder: number;
  messageRule?: {
    id?: string;
    isActive: boolean;
    subjectTemplate: string;
    bodyTemplate: string;
  } | null;
}

export interface PostingStage {
  id: string;
  name: string;
  /** @deprecated stages no longer carry pass/fail semantics. */
  type?: string;
  displayOrder: number;
  showOnCalendar: boolean;
  isActive: boolean;
  statuses: StageStatus[];
  autoSend?: AutoSendConfig;
}

export interface JobPosting {
  id: string;
  title: string;
  department: string;
  field: string;
  careerType: CareerType;
  employmentType: EmploymentType;
  startDate: string;
  endDate: string;
  isPublic: boolean;
  content: string;
  coverLetterQuestions: CoverLetterQuestion[];
  headcount: number;
  description: string;
  status: PostingStatus;
  derivedStatus: PostingDerivedStatus;
  publishedAt: string | null;
  closesAt: string | null;
  applicantCount?: number;
  activeApplicantCount?: number;
  separatedApplicantCount?: number;
  upcomingScheduleCount?: number;
  hiredCount?: number;
  stages?: PostingStage[];
  createdBy?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApplicationSummary {
  id: string;
  applicantId: string;
  applicantName: string;
  email: string;
  phone: string;
  source: string | null;
  no: number;
  platform: string;
  gender: Gender;
  birthDate: string;
  region: string;
  regionDetail: string;
  address: string;
  submissionStatus: SubmissionStatus;
  memo?: string | null;
  postingId: string;
  postingTitle: string;
  department: string;
  field: string;
  stageId: string | null;
  stageName: string | null;
  statusId: string | null;
  statusName: string | null;
  applicationStatus: "active" | "separated" | "completed";
  appliedAt: string;
  separatedAt?: string | null;
  separatedReason?: string | null;
  separationSnapshot?: Record<string, unknown>;
  finalResult?: ApplicationFinalResult | null;
  stageRecords?: StageRecord[];
  posting?: JobPosting;
}

export interface EducationEntry {
  schoolName: string;
  degree: "대학교" | "대학원";
  period: string;
  majorField: string;
  major: string;
  minor?: string;
  gpa: number;
  gpaMax: number;
}

export interface CertificateEntry {
  name: string;
  issuer: string;
  acquiredDate: string;
}

export interface CareerEntry {
  company: string;
  role: string;
  period: string;
  description: string;
}

export interface ActivityEntry {
  name: string;
  role: string;
  organization: string;
  period: string;
  description: string;
}

export interface StatisticsPackageEntry {
  name: string;
  level: string;
  detail: string;
}

export interface ThesisInfo {
  title: string;
  keyword: string;
  summary: string;
}

export interface CoverLetterAnswer {
  questionId: string;
  answer: string;
}

export interface StageRecordMeta {
  startDate?: string;
  endDate?: string;
  time?: string;
  note?: string;
  send?: {
    sentAt: string;
    channels: Array<"email" | "sms">;
    auto?: boolean;
    subject?: string;
    body?: string;
  };
}

export interface StageRecord {
  stageId: string;
  statusId: string;
  meta?: StageRecordMeta;
  updatedAt: string;
}

export interface ApplicationFinalResult {
  result: "hired" | "rejected";
  reason: string | null;
  decidedAt: string;
}

export interface ApplicationDetail extends ApplicationSummary {
  applicantMemo: string | null;
  educations: EducationEntry[];
  certificates: CertificateEntry[];
  careers: CareerEntry[];
  activities: ActivityEntry[];
  statisticsPackages: StatisticsPackageEntry[];
  thesis: ThesisInfo | null;
  coverLetter: CoverLetterAnswer[];
  stageRecords: StageRecord[];
  finalResult: ApplicationFinalResult | null;
  separation: {
    reason: string;
    separatedAt: string;
    snapshot: {
      application?: {
        status?: string;
        applied_at?: string;
      };
      jobPosting?: {
        title?: string;
        department?: string;
      };
      stage?: {
        name?: string;
      } | null;
      stageStatus?: {
        name?: string;
      } | null;
    };
  } | null;
  stageHistory: Array<{
    id: string;
    fromStageName: string | null;
    fromStatusName: string | null;
    toStageName: string | null;
    toStatusName: string | null;
    reason: string | null;
    changedAt: string;
  }>;
  schedules: ScheduleItem[];
  messages: Array<{
    id: string;
    subject: string;
    body: string;
    status: "record_only";
    createdAt: string;
  }>;
  files: Array<{
    id: string;
    originalName: string;
    sizeBytes: number;
    mimeType: string;
    createdAt: string;
  }>;
  posting?: JobPosting;
}

export interface ScheduleItem {
  id: string;
  applicationId: string;
  postingId: string;
  stageId: string | null;
  applicantName: string;
  postingTitle: string;
  stageName: string | null;
  title: string;
  startsAt: string;
  endsAt: string | null;
  location: string | null;
  note: string | null;
  status: ScheduleStatus;
  bucket?: "upcoming" | "overdue" | "completed";
  date?: string;
  time?: string;
  email?: string;
  phone?: string;
  region?: string;
  field?: string;
  finalResult?: ApplicationFinalResult | null;
}

export interface DashboardData {
  openPostings: number;
  activeApplications: number;
  scheduledThisWeek: number;
  completedApplications: number;
  upcomingApplicationCount: number;
  hiredApplicationCount: number;
  postings: JobPosting[];
}

export interface ProcessPreset {
  stages: PostingStage[];
}

export interface ScheduleBuckets {
  upcoming: ScheduleItem[];
  overdue: ScheduleItem[];
  completed: ScheduleItem[];
}

export interface PipelineData {
  posting: JobPosting;
  columns: Array<{
    stage: PostingStage;
    applications: ApplicationSummary[];
  }>;
  nextCursor: string | null;
}

export interface Paginated<T> {
  items: T[];
  nextCursor: string | null;
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers:
      init?.body instanceof FormData
        ? init.headers
        : { "Content-Type": "application/json", ...init?.headers },
  });
  const body = (await response.json().catch(() => null)) as
    | { data?: T; error?: string }
    | T
    | null;
  if (!response.ok) {
    const message =
      body && typeof body === "object" && "error" in body
        ? body.error
        : undefined;
    throw new Error(message || "요청을 처리하지 못했습니다.");
  }
  if (body && typeof body === "object" && "data" in body) {
    return body.data as T;
  }
  return body as T;
}

function queryString(params: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const value = search.toString();
  return value ? `?${value}` : "";
}

export const careersKeys = {
  all: ["careers"] as const,
  dashboard: ["careers", "dashboard"] as const,
  postings: (params?: object) => ["careers", "postings", params] as const,
  posting: (id: string) => ["careers", "posting", id] as const,
  applications: (params?: object) =>
    ["careers", "applications", params] as const,
  application: (id: string) => ["careers", "application", id] as const,
  pipeline: (postingId: string) => ["careers", "pipeline", postingId] as const,
  separated: (params?: object) => ["careers", "separated", params] as const,
  schedules: (params?: object) => ["careers", "schedules", params] as const,
  processPreset: ["careers", "process-preset"] as const,
};

export function useDashboard() {
  return useQuery({
    queryKey: careersKeys.dashboard,
    queryFn: () => request<DashboardData>("/api/dashboard"),
  });
}

function usePaginatedQuery<T>(
  queryKey: QueryKey,
  path: string,
  params: Record<string, string | undefined> = {},
) {
  return useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) =>
      request<Paginated<T>>(
        `${path}${queryString({ ...params, cursor: pageParam })}`,
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    select: (data) => ({
      items: data.pages.flatMap((current) => current.items),
      nextCursor: data.pages[data.pages.length - 1]?.nextCursor ?? null,
    }),
  });
}

export function usePostings(
  params: {
    search?: string;
    status?: PostingDerivedStatus;
    employmentType?: EmploymentType;
    field?: string;
    sort?: PostingSort;
  } = {},
) {
  return usePaginatedQuery<JobPosting>(
    careersKeys.postings(params),
    "/api/job-postings",
    params,
  );
}

export function usePosting(id: string) {
  return useQuery({
    queryKey: careersKeys.posting(id),
    queryFn: () => request<JobPosting>(`/api/job-postings/${id}`),
    enabled: Boolean(id),
  });
}

export function useApplications(
  params: {
    search?: string;
    postingId?: string;
    stageId?: string;
    statusId?: string;
    field?: string;
    sort?: ApplicantSort;
  } = {},
) {
  return usePaginatedQuery<ApplicationSummary>(
    careersKeys.applications(params),
    "/api/applications",
    params,
  );
}

export function useApplication(id: string) {
  return useQuery({
    queryKey: careersKeys.application(id),
    queryFn: () => request<ApplicationDetail>(`/api/applications/${id}`),
    enabled: Boolean(id),
  });
}

export function usePipeline(postingId: string) {
  return useInfiniteQuery({
    queryKey: careersKeys.pipeline(postingId),
    queryFn: ({ pageParam }) =>
      request<PipelineData>(
        `/api/applications/pipeline${queryString({
          postingId,
          cursor: pageParam,
        })}`,
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    select: (data) => {
      const firstPage = data.pages[0];
      if (!firstPage) return undefined;
      return {
        posting: firstPage.posting,
        columns: firstPage.columns.map((column) => ({
          stage: column.stage,
          applications: data.pages.flatMap(
            (current) =>
              current.columns.find(
                (candidate) => candidate.stage.id === column.stage.id,
              )?.applications ?? [],
          ),
        })),
        nextCursor: data.pages[data.pages.length - 1]?.nextCursor ?? null,
      };
    },
    enabled: Boolean(postingId),
  });
}

export function useSeparatedApplications(
  params: {
    search?: string;
    postingId?: string;
    sort?: SeparatedSort;
  } = {},
) {
  return usePaginatedQuery<ApplicationSummary>(
    careersKeys.separated(params),
    "/api/separated-applications",
    params,
  );
}

export function useSchedules(params: { from?: string; to?: string } = {}) {
  return useQuery({
    queryKey: careersKeys.schedules(params),
    queryFn: () =>
      request<ScheduleBuckets>(`/api/schedules${queryString(params)}`),
  });
}

export function useProcessPreset() {
  return useQuery({
    queryKey: careersKeys.processPreset,
    queryFn: () => request<ProcessPreset>("/api/process-preset"),
  });
}

export function useCareersMutation<TVariables>(
  mutationFn: (variables: TVariables) => Promise<unknown>,
  invalidate: QueryKey[] = [careersKeys.all],
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: async () => {
      await Promise.all(
        invalidate.map((queryKey) =>
          queryClient.invalidateQueries({ queryKey }),
        ),
      );
    },
  });
}

export const careersApi = {
  createPosting: (body: object) =>
    request<JobPosting>("/api/job-postings", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updatePosting: (id: string, body: object) =>
    request<JobPosting>(`/api/job-postings/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  softDeletePosting: (id: string) =>
    request(`/api/job-postings/${id}`, { method: "DELETE" }),
  saveProcess: (id: string, stages: PostingStage[]) =>
    request(`/api/job-postings/${id}/process`, {
      method: "PUT",
      body: JSON.stringify({ stages }),
    }),
  getProcessDeleteImpact: (
    id: string,
    target: { stageId?: string; statusId?: string },
  ) =>
    request<{ affectedApplications: number }>(
      `/api/job-postings/${id}/process${queryString(target)}`,
    ),
  createApplication: (body: object) =>
    request("/api/applications", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateApplication: (id: string, body: object) =>
    request(`/api/applications/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  softDeleteApplication: (id: string) =>
    request(`/api/applications/${id}`, { method: "DELETE" }),
  transition: (
    id: string,
    body: {
      stageId: string;
      statusId: string;
      reason?: string;
      meta?: StageRecordMeta;
      sendIntent?: "auto" | "manual" | "preserve";
    },
  ) =>
    request(`/api/applications/${id}/transition`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  finalResult: (
    id: string,
    body: {
      result: "hired" | "rejected";
      reason?: string;
    },
  ) =>
    request(`/api/applications/${id}/final-result`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  clearFinalResult: (id: string) =>
    request(`/api/applications/${id}/final-result/clear`, { method: "DELETE" }),
  separate: (id: string, reason: string) =>
    request(`/api/applications/${id}/separate`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),
  restore: (id: string) =>
    request(`/api/applications/${id}/restore`, { method: "POST" }),
  updateSeparationReason: (id: string, reason: string) =>
    request(`/api/applications/${id}/separation`, {
      method: "PATCH",
      body: JSON.stringify({ reason }),
    }),
  saveProcessPreset: (stages: PostingStage[]) =>
    request<ProcessPreset>("/api/process-preset", {
      method: "PUT",
      body: JSON.stringify({ stages }),
    }),
  recordMessage: (
    id: string,
    body: {
      stageId?: string;
      channels?: Array<"email" | "sms">;
      subject: string;
      body: string;
      variables?: Record<string, string>;
    },
  ) =>
    request(`/api/applications/${id}/messages`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  uploadFile: (id: string, file: File) => {
    const body = new FormData();
    body.set("file", file);
    return request(`/api/applications/${id}/files`, {
      method: "POST",
      body,
    });
  },
  deleteFile: (id: string) => request(`/api/files/${id}`, { method: "DELETE" }),
  createSchedule: (body: object) =>
    request("/api/schedules", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateSchedule: (id: string, body: object) =>
    request(`/api/schedules/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteSchedule: (id: string) =>
    request(`/api/schedules/${id}`, { method: "DELETE" }),
};
