-- =============================================================
-- Work Records + Assignment Pay Override Migration
-- =============================================================

-- assignments 테이블에 단가 오버라이드 컬럼 추가
ALTER TABLE supervisor.assignments
  ADD COLUMN pay_rate_override numeric CHECK (pay_rate_override IS NULL OR pay_rate_override > 0);
ALTER TABLE supervisor.assignments
  ADD COLUMN pay_type_override text CHECK (pay_type_override IS NULL OR pay_type_override IN ('hourly', 'daily'));

-- work_records (근무 기록)
CREATE TABLE supervisor.work_records (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id uuid NOT NULL REFERENCES supervisor.assignments(id) ON DELETE CASCADE,
  work_date date NOT NULL,
  work_hours numeric(4,1) NOT NULL CHECK (work_hours >= 0 AND work_hours <= 24),
  note text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(assignment_id, work_date)
);

CREATE INDEX idx_work_records_assignment_id ON supervisor.work_records(assignment_id);
CREATE INDEX idx_work_records_work_date ON supervisor.work_records(work_date);

-- RLS
ALTER TABLE supervisor.work_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON supervisor.work_records
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Grant
GRANT ALL ON supervisor.work_records TO service_role;

-- updated_at 트리거 (기존 supervisor 패턴)
CREATE TRIGGER set_updated_at BEFORE UPDATE ON supervisor.work_records
  FOR EACH ROW EXECUTE FUNCTION supervisor.update_updated_at();
