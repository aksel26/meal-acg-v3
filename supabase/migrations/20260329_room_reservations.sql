-- 회의실 예약 테이블
CREATE TABLE supervisor.room_reservations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id     text NOT NULL,
  date        date NOT NULL,
  start_time  time NOT NULL,
  end_time    time NOT NULL,
  type        text NOT NULL CHECK (type IN ('supervisor', 'interview')),
  title       text,
  content     text,
  reserved_by text NOT NULL,
  cc_members  text[] DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_room_reservations_date ON supervisor.room_reservations(date);
CREATE INDEX idx_room_reservations_room_date ON supervisor.room_reservations(room_id, date);

ALTER TABLE supervisor.room_reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON supervisor.room_reservations
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

GRANT ALL ON supervisor.room_reservations TO service_role;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON supervisor.room_reservations
  FOR EACH ROW EXECUTE FUNCTION supervisor.update_updated_at();
