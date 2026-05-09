-- Multi-assignee and multi-team support for request management MVP

ALTER TABLE request_management.requests
  ADD COLUMN IF NOT EXISTS assignee_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS assignee_names text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS team_names text[] NOT NULL DEFAULT '{}';

UPDATE request_management.requests
SET
  assignee_ids = CASE
    WHEN assignee_id IS NULL THEN '{}'
    ELSE ARRAY[assignee_id]
  END,
  assignee_names = CASE
    WHEN assignee_name IS NULL THEN '{}'
    ELSE ARRAY[assignee_name]
  END,
  team_names = CASE
    WHEN team_name IS NULL THEN '{}'
    ELSE ARRAY[team_name]
  END
WHERE
  assignee_ids = '{}'
  AND assignee_names = '{}'
  AND team_names = '{}';

CREATE INDEX IF NOT EXISTS idx_rm_requests_assignee_ids
  ON request_management.requests USING gin(assignee_ids);
