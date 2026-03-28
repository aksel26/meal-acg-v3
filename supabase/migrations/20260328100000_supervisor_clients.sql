-- =============================================================
-- Supervisor Clients Table Migration
-- 고객사 테이블 생성
-- =============================================================

-- clients (고객사)
CREATE TABLE supervisor.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  parent_company text,
  contact_name text,
  contact_phone text,
  contact_email text,
  memo text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_clients_name ON supervisor.clients(name);

-- =============================================================
-- Row Level Security
-- =============================================================

ALTER TABLE supervisor.clients ENABLE ROW LEVEL SECURITY;

-- Service role만 접근 허용 (API 라우트에서 service client 사용)
CREATE POLICY "service_role_all" ON supervisor.clients
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Grant
GRANT ALL ON supervisor.clients TO service_role;

-- =============================================================
-- Trigger: updated_at 자동 갱신
-- =============================================================

CREATE TRIGGER set_updated_at BEFORE UPDATE ON supervisor.clients
  FOR EACH ROW EXECUTE FUNCTION supervisor.update_updated_at();
