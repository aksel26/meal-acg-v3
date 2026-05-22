CREATE TABLE IF NOT EXISTS public.company_vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_type text NOT NULL,
  vehicle_name text NOT NULL,
  passenger_capacity integer NOT NULL DEFAULT 5 CHECK (passenger_capacity > 0),
  license_plate text,
  has_hipass boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'available'
    CHECK (status IN ('available', 'in_use', 'maintenance', 'disabled')),
  odometer_km numeric(10, 1),
  memo text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.company_vehicles IS '사내 차량 정보 및 이용 가능 상태';
COMMENT ON COLUMN public.company_vehicles.vehicle_type IS '차량 종류';
COMMENT ON COLUMN public.company_vehicles.vehicle_name IS '차량 이름';
COMMENT ON COLUMN public.company_vehicles.passenger_capacity IS '탑승 가능 인원';
COMMENT ON COLUMN public.company_vehicles.has_hipass IS '하이패스 장착 여부';

CREATE INDEX IF NOT EXISTS idx_company_vehicles_status
  ON public.company_vehicles (status, vehicle_type, vehicle_name);

CREATE TABLE IF NOT EXISTS public.vehicle_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_date date NOT NULL DEFAULT CURRENT_DATE,
  requester_id uuid REFERENCES public.members(id) ON DELETE SET NULL,
  department text NOT NULL,
  applicant_name text NOT NULL,
  purpose text NOT NULL,
  passengers text,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  vehicle_type text NOT NULL,
  vehicle_id uuid REFERENCES public.company_vehicles(id) ON DELETE SET NULL,
  vehicle_name_snapshot text NOT NULL,
  has_hipass boolean NOT NULL DEFAULT false,
  approver_name text NOT NULL DEFAULT '윤이나',
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  reject_reason text,
  departure_place text NOT NULL,
  arrival_place text NOT NULL,
  same_day_distance_km numeric(10, 1),
  total_distance_km numeric(10, 1),
  edited_at timestamptz,
  shared_references text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_at > start_at)
);

COMMENT ON TABLE public.vehicle_applications IS '사내 차량 사용 신청 및 사용 내역';
COMMENT ON COLUMN public.vehicle_applications.request_date IS '신청일';
COMMENT ON COLUMN public.vehicle_applications.department IS '소속';
COMMENT ON COLUMN public.vehicle_applications.applicant_name IS '신청자';
COMMENT ON COLUMN public.vehicle_applications.purpose IS '사용목적';
COMMENT ON COLUMN public.vehicle_applications.passengers IS '동승자';
COMMENT ON COLUMN public.vehicle_applications.vehicle_name_snapshot IS '신청 당시 차량이름(인승)';
COMMENT ON COLUMN public.vehicle_applications.same_day_distance_km IS '당일 주행거리(회사차량)';
COMMENT ON COLUMN public.vehicle_applications.total_distance_km IS '총 주행거리(회사차량)';
COMMENT ON COLUMN public.vehicle_applications.shared_references IS '참조자(공유)';

CREATE INDEX IF NOT EXISTS idx_vehicle_applications_requester
  ON public.vehicle_applications (requester_id, request_date DESC);
CREATE INDEX IF NOT EXISTS idx_vehicle_applications_status
  ON public.vehicle_applications (status, start_at DESC);
CREATE INDEX IF NOT EXISTS idx_vehicle_applications_vehicle_period
  ON public.vehicle_applications (vehicle_id, start_at, end_at);

INSERT INTO public.company_vehicles (
  vehicle_type,
  vehicle_name,
  passenger_capacity,
  license_plate,
  has_hipass,
  status
)
VALUES
  ('승용', '쏘나타', 5, '미등록', true, 'available'),
  ('SUV', '팰리세이드', 7, '미등록', true, 'available')
ON CONFLICT DO NOTHING;

CREATE OR REPLACE TRIGGER set_company_vehicles_updated_at
  BEFORE UPDATE ON public.company_vehicles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER set_vehicle_applications_updated_at
  BEFORE UPDATE ON public.vehicle_applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
