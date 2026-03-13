-- 출석 체크 기능을 위한 assignments 테이블 확장
ALTER TABLE supervisor.assignments
  ADD COLUMN IF NOT EXISTS attendance_status text
    CHECK (attendance_status IN ('checked_in', 'confirmed')),
  ADD COLUMN IF NOT EXISTS checked_in_at timestamptz,
  ADD COLUMN IF NOT EXISTS attendance_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS attendance_confirmed_by text;
