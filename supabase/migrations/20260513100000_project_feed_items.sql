-- Per-project chronological feed for quick project notes and updates.

CREATE TABLE IF NOT EXISTS work.project_feed_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES work.projects(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (char_length(trim(content)) > 0),
  created_by uuid NOT NULL REFERENCES public.members(id),
  created_by_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_work_project_feed_items_project
  ON work.project_feed_items(project_id, created_at);

ALTER TABLE work.project_feed_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON work.project_feed_items
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

GRANT ALL ON work.project_feed_items TO service_role;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON work.project_feed_items
  FOR EACH ROW EXECUTE FUNCTION work.update_updated_at();
