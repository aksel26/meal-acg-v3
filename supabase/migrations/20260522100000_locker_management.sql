CREATE TABLE IF NOT EXISTS public.lockers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  location_zone text NOT NULL,
  location_detail text NOT NULL,
  floor text,
  row_label text,
  column_label text,
  status text NOT NULL DEFAULT 'available'
    CHECK (status IN ('available', 'assigned', 'disabled')),
  memo text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.lockers IS '사내 개인 사물함 위치 및 상태';
COMMENT ON COLUMN public.lockers.code IS '사물함 표시 번호 또는 코드';
COMMENT ON COLUMN public.lockers.location_zone IS '사물함 구역명';
COMMENT ON COLUMN public.lockers.location_detail IS '구체적인 위치 설명';

CREATE INDEX IF NOT EXISTS idx_lockers_location
  ON public.lockers (location_zone, floor, row_label, column_label);
CREATE INDEX IF NOT EXISTS idx_lockers_status
  ON public.lockers (status);

CREATE TABLE IF NOT EXISTS public.locker_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  locker_id uuid NOT NULL REFERENCES public.lockers(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  released_at timestamptz,
  assigned_by uuid REFERENCES public.members(id) ON DELETE SET NULL,
  memo text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_locker_assignments_active_locker
  ON public.locker_assignments (locker_id)
  WHERE released_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_locker_assignments_active_member
  ON public.locker_assignments (member_id)
  WHERE released_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_locker_assignments_member
  ON public.locker_assignments (member_id, assigned_at DESC);

CREATE TABLE IF NOT EXISTS public.locker_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  request_type text NOT NULL CHECK (request_type IN ('assign', 'move')),
  preferred_locker_id uuid REFERENCES public.lockers(id) ON DELETE SET NULL,
  current_locker_id uuid REFERENCES public.lockers(id) ON DELETE SET NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  processed_by uuid REFERENCES public.members(id) ON DELETE SET NULL,
  processed_at timestamptz,
  reject_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_locker_requests_requester
  ON public.locker_requests (requester_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_locker_requests_status
  ON public.locker_requests (status, created_at DESC);

INSERT INTO public.lockers (code, location_zone, location_detail, row_label, column_label)
SELECT
  slot_no::text,
  '사내 사물함',
  '개인 사물함 구역',
  ((slot_no - 1) / 6 + 1)::text,
  ((slot_no - 1) % 6 + 1)::text
FROM generate_series(1, 36) AS slot_no
ON CONFLICT (code) DO NOTHING;

CREATE OR REPLACE TRIGGER set_lockers_updated_at
  BEFORE UPDATE ON public.lockers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER set_locker_assignments_updated_at
  BEFORE UPDATE ON public.locker_assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER set_locker_requests_updated_at
  BEFORE UPDATE ON public.locker_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
