-- 출퇴근 기록 테이블 컬럼 확장
ALTER TABLE attendance_records
  ADD COLUMN IF NOT EXISTS attendance_type text NOT NULL DEFAULT '출근',
  ADD COLUMN IF NOT EXISTS modifier_id uuid REFERENCES members(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS reference text,
  ADD COLUMN IF NOT EXISTS approver_id uuid REFERENCES members(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS login_ip text,
  ADD COLUMN IF NOT EXISTS login_ip2 text;

COMMENT ON COLUMN attendance_records.attendance_type IS '근태명: 출근, 연차, 오전반차, 오후반차, 외근, 출장, 재택근무, 병가, 경조사, 기타';
COMMENT ON COLUMN attendance_records.modifier_id IS '수정자 (members FK)';
COMMENT ON COLUMN attendance_records.location IS '장소';
COMMENT ON COLUMN attendance_records.reference IS '참조';
COMMENT ON COLUMN attendance_records.approver_id IS '승인자 (members FK)';
COMMENT ON COLUMN attendance_records.approved_at IS '승인일';
COMMENT ON COLUMN attendance_records.login_ip IS '로그인 IP';
COMMENT ON COLUMN attendance_records.login_ip2 IS '로그인 IP 2';
