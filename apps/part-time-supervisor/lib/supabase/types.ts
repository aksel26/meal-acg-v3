export type JobPosting = {
  id: string;
  title: string;
  location: string | null;
  start_date: string;
  end_date: string;
  work_start: string | null;
  work_end: string | null;
  pay_rate: number;
  pay_type: "hourly" | "daily";
  headcount: number;
  status: "open" | "closed" | "draft";
  description: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type Worker = {
  id: string;
  name: string;
  phone: string | null;
  birth_date: string | null;
  bank_name: string | null;
  account_number: string | null;
  status: "registered" | "contracted" | "working" | "completed";
  note: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type Assignment = {
  id: string;
  worker_id: string;
  job_posting_id: string;
  status: "assigned" | "working" | "completed" | "cancelled";
  assigned_at: string;
  updated_at: string;
};

export type ContractDocument = {
  id: string;
  worker_id: string;
  assignment_id: string | null;
  file_name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  uploaded_by: string | null;
  uploaded_at: string;
};

export type JobPostingWithAssignments = JobPosting & {
  assignments: { count: number }[];
};

export type WorkerWithAssignments = Worker & {
  assignment_count: number;
};

export type AssignmentWithDetails = Assignment & {
  worker?: { name: string };
  job_posting?: { title: string };
};
