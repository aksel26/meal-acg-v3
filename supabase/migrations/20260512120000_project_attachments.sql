-- Per-project attachments storage and metadata table.

CREATE TABLE IF NOT EXISTS project_management.project_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES project_management.projects(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  storage_path text NOT NULL,
  content_type text,
  size_bytes bigint NOT NULL DEFAULT 0 CHECK (size_bytes >= 0),
  uploaded_by uuid NOT NULL REFERENCES public.members(id),
  uploaded_by_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pm_project_attachments_project
  ON project_management.project_attachments(project_id, created_at);

ALTER TABLE project_management.project_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON project_management.project_attachments
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

GRANT ALL ON project_management.project_attachments TO service_role;

INSERT INTO storage.buckets (id, name, public)
VALUES ('project-attachments', 'project-attachments', false)
ON CONFLICT (id) DO NOTHING;
