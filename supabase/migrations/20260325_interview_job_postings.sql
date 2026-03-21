-- =============================================================
-- Interview Education Job Postings & Assignments
-- 면접교육 공고 관리 및 인원 배정
-- =============================================================

-- 1. interview_personnel role에 'other' 추가
ALTER TABLE supervisor.interview_personnel
  DROP CONSTRAINT IF EXISTS interview_personnel_role_check;
ALTER TABLE supervisor.interview_personnel
  ADD CONSTRAINT interview_personnel_role_check CHECK (role IN ('rp', 'ft', 'instructor', 'other'));

-- 2. interview_job_postings (면접교육 공고)
CREATE TABLE supervisor.interview_job_postings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  work_start time,
  work_end time,
  platform text,
  total_headcount int NOT NULL DEFAULT 0,
  ft_count int NOT NULL DEFAULT 0,
  rp_count int NOT NULL DEFAULT 0,
  instructor_count int NOT NULL DEFAULT 0,
  other_count int NOT NULL DEFAULT 0,
  pay_rate numeric(10, 2),
  pay_type text DEFAULT 'daily' CHECK (pay_type IN ('hourly', 'daily')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'closed', 'completed')),
  description text,
  created_by uuid REFERENCES public.members(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_interview_job_postings_status ON supervisor.interview_job_postings(status);

-- 3. interview_job_assignments (면접교육 공고 인원 배정)
CREATE TABLE supervisor.interview_job_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_posting_id uuid NOT NULL REFERENCES supervisor.interview_job_postings(id) ON DELETE CASCADE,
  personnel_id uuid NOT NULL REFERENCES supervisor.interview_personnel(id),
  pay_type text NOT NULL DEFAULT 'daily' CHECK (pay_type IN ('hourly', 'daily')),
  pay_rate numeric(10, 2) NOT NULL,
  work_hours numeric(4, 1),
  status text NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned', 'completed', 'cancelled')),
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(job_posting_id, personnel_id)
);

CREATE INDEX idx_interview_job_assignments_posting ON supervisor.interview_job_assignments(job_posting_id);
CREATE INDEX idx_interview_job_assignments_personnel ON supervisor.interview_job_assignments(personnel_id);

-- 4. RLS (service_role only)
ALTER TABLE supervisor.interview_job_postings ENABLE ROW LEVEL SECURITY;
ALTER TABLE supervisor.interview_job_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON supervisor.interview_job_postings
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "service_role_all" ON supervisor.interview_job_assignments
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- 5. Grant permissions
GRANT ALL ON supervisor.interview_job_postings TO service_role;
GRANT ALL ON supervisor.interview_job_assignments TO service_role;

-- 6. updated_at trigger
CREATE TRIGGER set_updated_at BEFORE UPDATE ON supervisor.interview_job_postings
  FOR EACH ROW EXECUTE FUNCTION supervisor.update_updated_at();
