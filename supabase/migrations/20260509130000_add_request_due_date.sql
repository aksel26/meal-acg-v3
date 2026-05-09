-- Add due_date to request_management.requests for personal calendar view
ALTER TABLE request_management.requests
  ADD COLUMN IF NOT EXISTS due_date date;

CREATE INDEX IF NOT EXISTS idx_rm_requests_assignee_due
  ON request_management.requests(assignee_id, due_date)
  WHERE due_date IS NOT NULL;
