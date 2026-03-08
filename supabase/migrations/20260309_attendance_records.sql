-- ============================================================
-- 출퇴근 기록 테이블 마이그레이션
-- attendance_records: 일별 출근/퇴근 시각 기록
-- ============================================================

CREATE TABLE attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  work_date DATE NOT NULL DEFAULT CURRENT_DATE,
  check_in_at TIMESTAMPTZ,
  check_out_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (member_id, work_date)
);

COMMENT ON TABLE attendance_records IS '출퇴근 기록 테이블';
COMMENT ON COLUMN attendance_records.member_id IS '멤버 (members FK)';
COMMENT ON COLUMN attendance_records.work_date IS '근무 일자';
COMMENT ON COLUMN attendance_records.check_in_at IS '출근 시각';
COMMENT ON COLUMN attendance_records.check_out_at IS '퇴근 시각';

CREATE INDEX idx_attendance_member_date ON attendance_records (member_id, work_date);

-- updated_at 자동 갱신 트리거 (dayoffs 패턴 재사용)
CREATE OR REPLACE FUNCTION update_attendance_records_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_attendance_records_updated_at
  BEFORE UPDATE ON attendance_records
  FOR EACH ROW
  EXECUTE FUNCTION update_attendance_records_updated_at();
