-- 지출결의서를 월별 → 공고별로 변경
-- 기존 데이터 없으므로 테이블 재생성

-- 기존 트리거, 정책, 테이블 제거
DROP TRIGGER IF EXISTS set_updated_at ON supervisor.interview_expense_reports;
DROP POLICY IF EXISTS "service_role_all" ON supervisor.interview_expense_reports;
DROP TABLE IF EXISTS supervisor.interview_expense_reports;

-- 공고 연결 테이블 재생성
CREATE TABLE supervisor.interview_expense_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_posting_id uuid NOT NULL REFERENCES supervisor.interview_job_postings(id) ON DELETE CASCADE,
  title text NOT NULL,
  items jsonb NOT NULL DEFAULT '[]',
  total_labor_cost numeric(12, 2) NOT NULL DEFAULT 0,
  total_extra_cost numeric(12, 2) NOT NULL DEFAULT 0,
  grand_total numeric(12, 2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'finalized')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(job_posting_id)
);

-- RLS
ALTER TABLE supervisor.interview_expense_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON supervisor.interview_expense_reports
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Grant
GRANT ALL ON supervisor.interview_expense_reports TO service_role;

-- updated_at trigger
CREATE TRIGGER set_updated_at BEFORE UPDATE ON supervisor.interview_expense_reports
  FOR EACH ROW EXECUTE FUNCTION supervisor.update_updated_at();

-- Index
CREATE INDEX idx_interview_expense_reports_job_posting
  ON supervisor.interview_expense_reports(job_posting_id);
