-- Attachments scoped to individual project feed items.

CREATE TABLE IF NOT EXISTS work.project_feed_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES work.projects(id) ON DELETE CASCADE,
  feed_item_id uuid NOT NULL REFERENCES work.project_feed_items(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  storage_path text NOT NULL,
  content_type text,
  size_bytes bigint NOT NULL DEFAULT 0 CHECK (size_bytes >= 0),
  uploaded_by uuid NOT NULL REFERENCES public.members(id),
  uploaded_by_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_work_project_feed_attachments_feed
  ON work.project_feed_attachments(feed_item_id, created_at);

CREATE INDEX IF NOT EXISTS idx_work_project_feed_attachments_project
  ON work.project_feed_attachments(project_id, created_at);

ALTER TABLE work.project_feed_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON work.project_feed_attachments
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

GRANT ALL ON work.project_feed_attachments TO service_role;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON work.project_feed_attachments
  FOR EACH ROW EXECUTE FUNCTION work.update_updated_at();
