-- Add rooms column to job_postings (jsonb array of room IDs, default null)
ALTER TABLE supervisor.job_postings
ADD COLUMN rooms jsonb DEFAULT NULL;
