-- settlement_locks: 정산 확정/잠금 테이블

CREATE TYPE supervisor.settlement_type AS ENUM ('supervisor', 'interview');

CREATE TABLE supervisor.settlement_locks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type        supervisor.settlement_type NOT NULL,
  year        int NOT NULL,
  month       int NOT NULL,
  locked_at   timestamptz NOT NULL DEFAULT now(),
  locked_by   text NOT NULL,
  memo        text,
  UNIQUE (type, year, month)
);

-- RLS: service_role 전용
ALTER TABLE supervisor.settlement_locks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role only" ON supervisor.settlement_locks
  USING (auth.role() = 'service_role');
