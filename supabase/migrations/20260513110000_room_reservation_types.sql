ALTER TABLE supervisor.room_reservations
  DROP CONSTRAINT IF EXISTS room_reservations_type_check;

ALTER TABLE supervisor.room_reservations
  ADD CONSTRAINT room_reservations_type_check
  CHECK (type IN ('supervisor', 'interview', 'meeting', 'client_meeting', 'partner_meeting'));
