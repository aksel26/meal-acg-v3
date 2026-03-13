-- =============================================================
-- Supervisor Schema Migration
-- 감독관 아르바이트 관리 앱용 스키마
-- =============================================================

-- Create supervisor schema
CREATE SCHEMA IF NOT EXISTS supervisor;

-- Enable pgcrypto for encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =============================================================
-- Tables
-- =============================================================

-- job_postings (공고)
CREATE TABLE supervisor.job_postings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  location text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  work_start time,
  work_end time,
  pay_rate numeric(10, 2) NOT NULL,
  pay_type text NOT NULL DEFAULT 'hourly'
    CHECK (pay_type IN ('hourly', 'daily')),
  headcount integer NOT NULL DEFAULT 1
    CHECK (headcount > 0),
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'closed', 'draft')),
  description text,
  created_by uuid REFERENCES public.members(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date)
);

CREATE INDEX idx_job_postings_status ON supervisor.job_postings(status);
CREATE INDEX idx_job_postings_created_by ON supervisor.job_postings(created_by);

-- workers (지원자)
CREATE TABLE supervisor.workers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  birth_date date,
  bank_name text,
  account_number text,
  status text NOT NULL DEFAULT 'registered'
    CHECK (status IN ('registered', 'contracted', 'working', 'completed')),
  note text,
  created_by uuid REFERENCES public.members(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_workers_status ON supervisor.workers(status);
CREATE INDEX idx_workers_created_by ON supervisor.workers(created_by);

-- assignments (배정)
CREATE TABLE supervisor.assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL REFERENCES supervisor.workers(id) ON DELETE CASCADE,
  job_posting_id uuid NOT NULL REFERENCES supervisor.job_postings(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'assigned'
    CHECK (status IN ('assigned', 'working', 'completed', 'cancelled')),
  assigned_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(worker_id, job_posting_id)
);

CREATE INDEX idx_assignments_worker_id ON supervisor.assignments(worker_id);
CREATE INDEX idx_assignments_job_posting_id ON supervisor.assignments(job_posting_id);
CREATE INDEX idx_assignments_status ON supervisor.assignments(status);

-- contract_documents (계약서 파일)
CREATE TABLE supervisor.contract_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL REFERENCES supervisor.workers(id) ON DELETE CASCADE,
  assignment_id uuid REFERENCES supervisor.assignments(id) ON DELETE SET NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size integer,
  mime_type text,
  uploaded_by uuid REFERENCES public.members(id),
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_contract_documents_worker_id ON supervisor.contract_documents(worker_id);
CREATE INDEX idx_contract_documents_assignment_id ON supervisor.contract_documents(assignment_id);

-- =============================================================
-- Row Level Security
-- =============================================================

ALTER TABLE supervisor.job_postings ENABLE ROW LEVEL SECURITY;
ALTER TABLE supervisor.workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE supervisor.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE supervisor.contract_documents ENABLE ROW LEVEL SECURITY;

-- Service role만 접근 허용 (API 라우트에서 service client 사용)
CREATE POLICY "service_role_all" ON supervisor.job_postings
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "service_role_all" ON supervisor.workers
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "service_role_all" ON supervisor.assignments
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "service_role_all" ON supervisor.contract_documents
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Grant schema usage
GRANT USAGE ON SCHEMA supervisor TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA supervisor TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA supervisor TO service_role;

-- =============================================================
-- Triggers: updated_at 자동 갱신
-- =============================================================

CREATE OR REPLACE FUNCTION supervisor.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON supervisor.job_postings
  FOR EACH ROW EXECUTE FUNCTION supervisor.update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON supervisor.workers
  FOR EACH ROW EXECUTE FUNCTION supervisor.update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON supervisor.assignments
  FOR EACH ROW EXECUTE FUNCTION supervisor.update_updated_at();

-- =============================================================
-- Triggers: 상태 전이 검증
-- =============================================================

-- Job posting: draft → open → closed (역방향 불가)
CREATE OR REPLACE FUNCTION supervisor.validate_job_posting_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status != OLD.status THEN
    IF NOT (
      (OLD.status = 'draft' AND NEW.status = 'open') OR
      (OLD.status = 'open' AND NEW.status = 'closed')
    ) THEN
      RAISE EXCEPTION 'Invalid job posting status transition: % → %', OLD.status, NEW.status;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_job_posting_status BEFORE UPDATE ON supervisor.job_postings
  FOR EACH ROW EXECUTE FUNCTION supervisor.validate_job_posting_status();

-- Worker: registered → contracted → working → completed (역방향 불가)
CREATE OR REPLACE FUNCTION supervisor.validate_worker_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status != OLD.status THEN
    IF NOT (
      (OLD.status = 'registered' AND NEW.status = 'contracted') OR
      (OLD.status = 'contracted' AND NEW.status = 'working') OR
      (OLD.status = 'working' AND NEW.status = 'completed')
    ) THEN
      RAISE EXCEPTION 'Invalid worker status transition: % → %', OLD.status, NEW.status;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_worker_status BEFORE UPDATE ON supervisor.workers
  FOR EACH ROW EXECUTE FUNCTION supervisor.validate_worker_status();

-- =============================================================
-- Storage bucket for contracts (Private)
-- 마이그레이션 실패 시 Supabase Studio > Storage > New Bucket 으로 수동 생성
-- =============================================================

INSERT INTO storage.buckets (id, name, public) VALUES ('contracts', 'contracts', false)
  ON CONFLICT (id) DO NOTHING;
