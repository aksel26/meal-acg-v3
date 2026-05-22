ALTER TABLE attendance_records
  DROP CONSTRAINT IF EXISTS attendance_records_status_check;

ALTER TABLE attendance_records
  ADD CONSTRAINT attendance_records_status_check
  CHECK (status IN ('pending', 'early_check_in', 'normal', 'late', 'early_leave', 'absent'));

COMMENT ON COLUMN attendance_records.status IS 'pending=미출근, early_check_in=조기출근, normal=정상, late=지각, early_leave=조퇴, absent=결근';
