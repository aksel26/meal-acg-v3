-- =============================================================
-- Request Management MVP
-- Notion "해주세요" replacement pilot app
-- =============================================================

CREATE SCHEMA IF NOT EXISTS request_management;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =============================================================
-- Tables
-- =============================================================

CREATE TABLE request_management.requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(trim(title)) > 0),
  body text,
  priority text NOT NULL DEFAULT 'P3'
    CHECK (priority IN ('P1', 'P2', 'P3')),
  status text NOT NULL DEFAULT '접수'
    CHECK (status IN ('접수', '진행', '대기', '완료', '거절')),
  requester_id uuid NOT NULL REFERENCES public.members(id),
  requester_name text NOT NULL,
  assignee_id uuid REFERENCES public.members(id),
  assignee_name text,
  team_name text,
  request_type text,
  request_type_name text,
  completion_note text,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (status <> '완료')
    OR (completion_note IS NOT NULL AND char_length(trim(completion_note)) >= 5)
  )
);

CREATE INDEX idx_rm_requests_requester ON request_management.requests(requester_id, created_at DESC);
CREATE INDEX idx_rm_requests_assignee ON request_management.requests(assignee_id, status, created_at DESC);
CREATE INDEX idx_rm_requests_status_priority ON request_management.requests(status, priority, created_at DESC);

CREATE TABLE request_management.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES request_management.requests(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.members(id),
  author_name text NOT NULL,
  body text NOT NULL CHECK (char_length(trim(body)) > 0),
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz,
  deleted_at timestamptz
);

CREATE INDEX idx_rm_comments_request ON request_management.comments(request_id, created_at);

CREATE TABLE request_management.attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES request_management.requests(id) ON DELETE CASCADE,
  comment_id uuid REFERENCES request_management.comments(id) ON DELETE SET NULL,
  file_name text NOT NULL,
  storage_path text NOT NULL,
  content_type text,
  size_bytes bigint NOT NULL DEFAULT 0 CHECK (size_bytes >= 0),
  uploaded_by uuid NOT NULL REFERENCES public.members(id),
  uploaded_by_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_rm_attachments_request ON request_management.attachments(request_id, created_at);

CREATE TABLE request_management.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES request_management.requests(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL REFERENCES public.members(id),
  actor_name text NOT NULL,
  event_type text NOT NULL,
  before jsonb,
  after jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_rm_events_request ON request_management.events(request_id, created_at);

-- =============================================================
-- Row Level Security
-- =============================================================

ALTER TABLE request_management.requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_management.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_management.attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_management.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON request_management.requests
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "service_role_all" ON request_management.comments
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "service_role_all" ON request_management.attachments
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "service_role_all" ON request_management.events
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

GRANT USAGE ON SCHEMA request_management TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA request_management TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA request_management TO service_role;

-- =============================================================
-- Triggers
-- =============================================================

CREATE OR REPLACE FUNCTION request_management.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON request_management.requests
  FOR EACH ROW EXECUTE FUNCTION request_management.update_updated_at();

CREATE OR REPLACE FUNCTION request_management.set_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = '완료' AND OLD.status <> '완료' THEN
    NEW.completed_at = now();
  ELSIF NEW.status <> '완료' THEN
    NEW.completed_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_completed_at BEFORE UPDATE ON request_management.requests
  FOR EACH ROW EXECUTE FUNCTION request_management.set_completed_at();

-- =============================================================
-- Storage bucket for request attachments (Private)
-- =============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('request-attachments', 'request-attachments', false)
ON CONFLICT (id) DO NOTHING;
