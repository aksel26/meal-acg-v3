ALTER TABLE supervisor.job_postings
  ADD COLUMN supervisor_id uuid REFERENCES public.members(id),
  ADD COLUMN supervisor_name text;
