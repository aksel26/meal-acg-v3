ALTER TABLE project_management.projects
  ADD COLUMN IF NOT EXISTS stakeholder_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS stakeholder_names text[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_pm_projects_stakeholder_ids
  ON project_management.projects USING gin(stakeholder_ids);
