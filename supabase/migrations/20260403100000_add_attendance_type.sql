ALTER TABLE attendance_records
ADD COLUMN IF NOT EXISTS attendance_type text NOT NULL DEFAULT '근무';

COMMENT ON COLUMN attendance_records.attendance_type IS '근태 유형: 근무, 휴가, 재택, 외근';
