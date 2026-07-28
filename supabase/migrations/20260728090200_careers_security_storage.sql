DO $$
DECLARE
  v_table regclass;
BEGIN
  FOR v_table IN
    SELECT format('%I.%I', schemaname, tablename)::regclass
    FROM pg_tables
    WHERE schemaname = 'careers'
  LOOP
    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', v_table);
    EXECUTE format(
      'CREATE POLICY service_role_all ON %s FOR ALL TO service_role USING (true) WITH CHECK (true)',
      v_table
    );
    EXECUTE format('REVOKE ALL ON %s FROM PUBLIC, anon, authenticated', v_table);
  END LOOP;
END;
$$;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA careers FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA careers FROM PUBLIC, anon, authenticated;

GRANT USAGE ON SCHEMA careers TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA careers TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA careers TO service_role;

REVOKE UPDATE, DELETE ON careers.application_stage_history FROM service_role;
REVOKE UPDATE, DELETE ON careers.message_history FROM service_role;
REVOKE UPDATE, DELETE ON careers.audit_logs FROM service_role;
REVOKE DELETE ON careers.job_postings FROM service_role;
REVOKE DELETE ON careers.applicants FROM service_role;
REVOKE DELETE ON careers.applicant_files FROM service_role;
REVOKE DELETE ON careers.schedule_events FROM service_role;

INSERT INTO storage.buckets (
  id, name, public, file_size_limit, allowed_mime_types
) VALUES (
  'careers-applicant-files',
  'careers-applicant-files',
  false,
  20971520,
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp'
  ]
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "service_role careers applicant files"
ON storage.objects
FOR ALL
TO service_role
USING (bucket_id = 'careers-applicant-files')
WITH CHECK (bucket_id = 'careers-applicant-files');
