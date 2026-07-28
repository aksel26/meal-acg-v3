export const JOB_POSTING_STATUSES = ["draft", "open", "closed"] as const;
export const CAREER_TYPES = ["신입", "경력"] as const;
export const EMPLOYMENT_TYPES = ["정규직", "계약직", "인턴"] as const;
export const GENDERS = ["남성", "여성"] as const;
export const SUBMISSION_STATUSES = ["완료", "미완료"] as const;
export const POSTING_SORTS = [
  "deadlineAsc",
  "createdDesc",
  "createdAsc",
  "updatedDesc",
  "applicantsDesc",
  "applicantsAsc",
  "statusFirst",
] as const;
export const APPLICANT_SORTS = ["newest", "oldest", "name"] as const;
export const SEPARATED_SORTS = [
  "recentSeparated",
  "oldestSeparated",
  "applicationNewest",
] as const;
export const APPLICATION_STATUSES = [
  "active",
  "separated",
  "completed",
] as const;
export const FINAL_RESULTS = ["hired", "rejected"] as const;
export const RESULT_MEANINGS = ["neutral", "pass", "fail"] as const;
export const MESSAGE_CHANNELS = ["email", "sms", "internal"] as const;
export const SCHEDULE_STATUSES = [
  "scheduled",
  "completed",
  "cancelled",
] as const;

export type CareersAdmin = {
  id: string;
  fullName: string;
  role: "admin";
};

export type JobPostingStatus = (typeof JOB_POSTING_STATUSES)[number];
export type CareerType = (typeof CAREER_TYPES)[number];
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];
export type Gender = (typeof GENDERS)[number];
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];
export type PostingSort = (typeof POSTING_SORTS)[number];
export type ApplicantSort = (typeof APPLICANT_SORTS)[number];
export type SeparatedSort = (typeof SEPARATED_SORTS)[number];
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];
export type FinalResult = (typeof FINAL_RESULTS)[number];
export type ResultMeaning = (typeof RESULT_MEANINGS)[number];
export type MessageChannel = (typeof MESSAGE_CHANNELS)[number];

export type JsonObject = Record<string, unknown>;

export type Paginated<T> = {
  items: T[];
  nextCursor: string | null;
};
