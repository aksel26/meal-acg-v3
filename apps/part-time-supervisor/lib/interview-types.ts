export type PersonnelRole = "rp" | "ft" | "instructor";
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
  memo: string | null;
  status: PersonnelStatus;
  created_at: string;
  updated_at: string;
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
