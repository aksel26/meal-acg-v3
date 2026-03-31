-- 출퇴근 기록 테이블
DROP TABLE IF EXISTS attendance_records CASCADE;

CREATE TABLE attendance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  date date NOT NULL,
  check_in_at timestamptz,
  check_out_at timestamptz,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'normal', 'late', 'early_leave', 'absent')),
  overtime_minutes integer NOT NULL DEFAULT 0,
  is_weekend boolean NOT NULL DEFAULT false,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(member_id, date)
);

CREATE INDEX idx_attendance_member_date ON attendance_records(member_id, date);
CREATE INDEX idx_attendance_date ON attendance_records(date);

CREATE TRIGGER set_attendance_updated_at
  BEFORE UPDATE ON attendance_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE attendance_records IS '출퇴근 기록';
COMMENT ON COLUMN attendance_records.status IS 'pending=미출근, normal=정상, late=지각, early_leave=조퇴, absent=결근';
COMMENT ON COLUMN attendance_records.overtime_minutes IS '초과근무 분 (퇴근가능시간+2h 이후부터 계산)';
