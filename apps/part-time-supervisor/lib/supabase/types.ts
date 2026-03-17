export type JobPosting = {
  id: string;
  title: string;
  location: string | null;
  start_date: string;
  end_date: string;
  description: string | null;
  work_start: string | null;
  work_end: string | null;
  pay_rate: number;
  pay_type: "hourly" | "daily";
  headcount: number;
  status: "open" | "closed" | "draft" | "in_progress" | "completed";
  work_type: "online" | "offline";
  shift_type: "day" | "night";
  platform: string | null;
  lunch_start: string | null;
  lunch_end: string | null;
  supervisor_id: string | null;
  rooms: string[] | null;
  supervisor_name: string | null;
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
  gender: "male" | "female" | null;
  experience: string | null;
  address: string | null;
  resident_id: string | null;
  email: string | null;
  warning: string | null;
  status: "registered" | "contracted" | "working" | "completed";
  work_start: string | null;
  work_end: string | null;
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
  contract_status: "signed" | "confirmed" | null;
  signature_image_path: string | null;
  signed_at: string | null;
  confirmed_at: string | null;
  confirmed_by: string | null;
  attendance_status: "checked_in" | "confirmed" | null;
  checked_in_at: string | null;
  attendance_confirmed_at: string | null;
  attendance_confirmed_by: string | null;
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
  worker?: { id: string; name: string; phone: string | null; status: string };
  job_posting?: { id: string; title: string; status: string };
  room_slots?: { date: string; start_time: string; end_time: string; room: string }[];
};
