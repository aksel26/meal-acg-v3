-- =============================================================
-- Interview Education Tables
-- 면접교육&검사 팀 인력 관리 및 정산
-- =============================================================

-- interview_personnel (면접교육 인력)
CREATE TABLE supervisor.interview_personnel (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  role text NOT NULL CHECK (role IN ('rp', 'ft', 'instructor')),
  bank_name text,
  account_number text,
  pay_type text NOT NULL CHECK (pay_type IN ('hourly', 'daily', 'contract')),
  default_pay_rate numeric(10, 2),
  contract_amount numeric(12, 2),
  memo text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_interview_personnel_role ON supervisor.interview_personnel(role);
CREATE INDEX idx_interview_personnel_status ON supervisor.interview_personnel(status);

-- interview_work_records (면접교육 근무기록)
CREATE TABLE supervisor.interview_work_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  personnel_id uuid NOT NULL REFERENCES supervisor.interview_personnel(id) ON DELETE CASCADE,
  work_date date NOT NULL,
  work_hours numeric(4, 1) NOT NULL CHECK (work_hours >= 0),
  pay_rate_override numeric(10, 2),
  pay_type_override text CHECK (pay_type_override IN ('hourly', 'daily')),
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_interview_work_records_personnel ON supervisor.interview_work_records(personnel_id);
CREATE INDEX idx_interview_work_records_date ON supervisor.interview_work_records(work_date);

-- interview_expense_reports (지출결의서)
CREATE TABLE supervisor.interview_expense_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year integer NOT NULL,
  month integer NOT NULL CHECK (month BETWEEN 1 AND 12),
  title text NOT NULL,
  items jsonb NOT NULL DEFAULT '[]',
  total_labor_cost numeric(12, 2) NOT NULL DEFAULT 0,
  total_extra_cost numeric(12, 2) NOT NULL DEFAULT 0,
  grand_total numeric(12, 2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'finalized')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(year, month)
);

-- RLS
ALTER TABLE supervisor.interview_personnel ENABLE ROW LEVEL SECURITY;
ALTER TABLE supervisor.interview_work_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE supervisor.interview_expense_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON supervisor.interview_personnel
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "service_role_all" ON supervisor.interview_work_records
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "service_role_all" ON supervisor.interview_expense_reports
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Grant permissions to service_role for new tables
GRANT ALL ON supervisor.interview_personnel TO service_role;
GRANT ALL ON supervisor.interview_work_records TO service_role;
GRANT ALL ON supervisor.interview_expense_reports TO service_role;

-- updated_at triggers
CREATE TRIGGER set_updated_at BEFORE UPDATE ON supervisor.interview_personnel
  FOR EACH ROW EXECUTE FUNCTION supervisor.update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON supervisor.interview_expense_reports
  FOR EACH ROW EXECUTE FUNCTION supervisor.update_updated_at();
