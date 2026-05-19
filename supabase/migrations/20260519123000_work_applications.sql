CREATE TABLE IF NOT EXISTS public.work_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  application_type text NOT NULL CHECK (application_type IN ('overtime', 'weekend')),
  work_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  project_name text NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approver_id uuid REFERENCES public.members(id) ON DELETE SET NULL,
  approved_at timestamptz,
  reject_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.work_applications IS '시간외/주말 근무 신청';
COMMENT ON COLUMN public.work_applications.application_type IS '신청 유형: overtime(시간외), weekend(주말)';
COMMENT ON COLUMN public.work_applications.project_name IS '프로젝트 또는 업무명';

CREATE INDEX IF NOT EXISTS idx_work_applications_requester
  ON public.work_applications (requester_id, work_date DESC);

CREATE INDEX IF NOT EXISTS idx_work_applications_status
  ON public.work_applications (status, work_date DESC);

CREATE INDEX IF NOT EXISTS idx_work_applications_approver
  ON public.work_applications (approver_id, status);

CREATE OR REPLACE TRIGGER set_work_applications_updated_at
  BEFORE UPDATE ON public.work_applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
