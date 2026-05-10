-- Project management MVP additions inside the existing request_management schema.

CREATE TABLE IF NOT EXISTS request_management.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(trim(title)) > 0),
  description text,
  customer_names text[] NOT NULL DEFAULT '{}',
  affiliate_names text[] NOT NULL DEFAULT '{}',
  owner_id uuid REFERENCES public.members(id),
  owner_name text,
  manager_ids uuid[] NOT NULL DEFAULT '{}',
  manager_names text[] NOT NULL DEFAULT '{}',
  stakeholder_ids uuid[] NOT NULL DEFAULT '{}',
  stakeholder_names text[] NOT NULL DEFAULT '{}',
  stakeholder_team_ids uuid[] NOT NULL DEFAULT '{}',
  stakeholder_team_names text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT '계획'
    CHECK (status IN ('계획', '진행', '대기', '완료')),
  start_date date,
  due_date date,
  created_by uuid NOT NULL REFERENCES public.members(id),
  created_by_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pm_projects_status_due
  ON request_management.projects(status, due_date);
CREATE INDEX IF NOT EXISTS idx_pm_projects_owner
  ON request_management.projects(owner_id, status, due_date);
CREATE INDEX IF NOT EXISTS idx_pm_projects_customer_names
  ON request_management.projects USING gin(customer_names);
CREATE INDEX IF NOT EXISTS idx_pm_projects_affiliate_names
  ON request_management.projects USING gin(affiliate_names);
CREATE INDEX IF NOT EXISTS idx_pm_projects_manager_ids
  ON request_management.projects USING gin(manager_ids);
CREATE INDEX IF NOT EXISTS idx_pm_projects_stakeholder_ids
  ON request_management.projects USING gin(stakeholder_ids);
CREATE INDEX IF NOT EXISTS idx_pm_projects_stakeholder_team_ids
  ON request_management.projects USING gin(stakeholder_team_ids);

CREATE TABLE IF NOT EXISTS request_management.project_requests (
  project_id uuid NOT NULL REFERENCES request_management.projects(id) ON DELETE CASCADE,
  request_id uuid NOT NULL REFERENCES request_management.requests(id) ON DELETE CASCADE,
  linked_by uuid NOT NULL REFERENCES public.members(id),
  linked_by_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, request_id)
);

CREATE INDEX IF NOT EXISTS idx_pm_project_requests_project
  ON request_management.project_requests(project_id, created_at);
CREATE INDEX IF NOT EXISTS idx_pm_project_requests_request
  ON request_management.project_requests(request_id, created_at);

CREATE TABLE IF NOT EXISTS request_management.project_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES request_management.projects(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(trim(title)) > 0),
  is_done boolean NOT NULL DEFAULT false,
  assignee_id uuid REFERENCES public.members(id),
  assignee_name text,
  due_date date,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid NOT NULL REFERENCES public.members(id),
  created_by_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pm_checklist_project_order
  ON request_management.project_checklist_items(project_id, sort_order, created_at);
CREATE INDEX IF NOT EXISTS idx_pm_checklist_assignee
  ON request_management.project_checklist_items(assignee_id, is_done, due_date);

ALTER TABLE request_management.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_management.project_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_management.project_checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON request_management.projects
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "service_role_all" ON request_management.project_requests
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "service_role_all" ON request_management.project_checklist_items
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

GRANT ALL ON ALL TABLES IN SCHEMA request_management TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA request_management TO service_role;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON request_management.projects
  FOR EACH ROW EXECUTE FUNCTION request_management.update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON request_management.project_checklist_items
  FOR EACH ROW EXECUTE FUNCTION request_management.update_updated_at();
