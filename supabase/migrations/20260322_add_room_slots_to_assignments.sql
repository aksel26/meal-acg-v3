ALTER TABLE supervisor.assignments
ADD COLUMN room_slots jsonb DEFAULT '[]';

ALTER TABLE supervisor.assignments
ADD CONSTRAINT room_slots_valid CHECK (
  jsonb_typeof(room_slots) = 'array'
);

COMMENT ON COLUMN supervisor.assignments.room_slots IS
  'Array of {date, start_time, end_time, room} objects for room assignments. Each slot is exactly 1 hour. KST timezone.';
