ALTER TABLE public.vehicle_applications
  ADD COLUMN IF NOT EXISTS return_start_odometer_km numeric(10, 1),
  ADD COLUMN IF NOT EXISTS return_end_odometer_km numeric(10, 1),
  ADD COLUMN IF NOT EXISTS return_distance_km numeric(10, 1),
  ADD COLUMN IF NOT EXISTS returned_by_id uuid REFERENCES public.members(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS returned_by_name text,
  ADD COLUMN IF NOT EXISTS returned_at timestamptz,
  ADD COLUMN IF NOT EXISTS return_memo text;

COMMENT ON COLUMN public.vehicle_applications.return_start_odometer_km IS '반납 시 입력한 주행 전 km';
COMMENT ON COLUMN public.vehicle_applications.return_end_odometer_km IS '반납 시 입력한 주행 후 km';
COMMENT ON COLUMN public.vehicle_applications.return_distance_km IS '반납 시 계산된 주행거리';
COMMENT ON COLUMN public.vehicle_applications.returned_by_id IS '반납 처리자';
COMMENT ON COLUMN public.vehicle_applications.returned_by_name IS '반납 처리자 이름 스냅샷';
COMMENT ON COLUMN public.vehicle_applications.returned_at IS '반납 일시';
COMMENT ON COLUMN public.vehicle_applications.return_memo IS '반납 메모';
