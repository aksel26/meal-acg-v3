-- =============================================================
-- Add client_id FK to job_postings and interview_job_postings
-- 공고에 고객사 연결
-- =============================================================

ALTER TABLE supervisor.job_postings
  ADD COLUMN client_id uuid REFERENCES supervisor.clients(id);

ALTER TABLE supervisor.interview_job_postings
  ADD COLUMN client_id uuid REFERENCES supervisor.clients(id);

CREATE INDEX idx_job_postings_client_id ON supervisor.job_postings(client_id);
CREATE INDEX idx_interview_job_postings_client_id ON supervisor.interview_job_postings(client_id);
