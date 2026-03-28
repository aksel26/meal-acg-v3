export type PersonnelRole = "rp" | "ft" | "instructor" | "other";
export type PersonnelPayType = "hourly" | "daily" | "contract";
export type PersonnelStatus = "active" | "inactive";
export type ExpenseReportStatus = "draft" | "finalized";

export type InterviewPersonnel = {
  id: string;
  name: string;
  phone: string | null;
  role: PersonnelRole;
  bank_name: string | null;
  account_number: string | null;
  pay_type: PersonnelPayType;
  default_pay_rate: number | null;
  contract_amount: number | null;
  experience: string | null;
  memo: string | null;
  status: PersonnelStatus;
  created_at: string;
  updated_at: string;
  // 참여 공고 & 출석 정보 (목록 조회 시)
  assignments?: {
    job_posting_id: string;
    job_posting_title: string;
    start_date: string;
    status: string;
  }[];
  work_record_count?: number;
};

export type InterviewWorkRecord = {
  id: string;
  personnel_id: string;
  work_date: string;
  work_hours: number;
  pay_rate_override: number | null;
  pay_type_override: "hourly" | "daily" | null;
  note: string | null;
  created_at: string;
};

export type ExpenseReportItem = {
  name: string;
  amount: number;
  note?: string;
};

export type InterviewExpenseReport = {
  id: string;
  year: number;
  month: number;
  title: string;
  items: ExpenseReportItem[];
  total_labor_cost: number;
  total_extra_cost: number;
  grand_total: number;
  status: ExpenseReportStatus;
  created_at: string;
  updated_at: string;
};

export type InterviewJobPosting = {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  work_start: string | null;
  work_end: string | null;
  platform: string | null;
  total_headcount: number;
  ft_count: number;
  rp_count: number;
  instructor_count: number;
  other_count: number;
  pay_rate: number | null;
  pay_type: string;
  status: string;
  description: string | null;
  client_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type InterviewJobPostingWithCount = InterviewJobPosting & {
  assignment_count: number;
  client?: { id: string; name: string } | null;
};

export type InterviewJobAssignment = {
  id: string;
  job_posting_id: string;
  personnel_id: string;
  pay_type: string;
  pay_rate: number;
  work_hours: number | null;
  status: string;
  note: string | null;
  created_at: string;
  personnel?: InterviewPersonnel;
};
