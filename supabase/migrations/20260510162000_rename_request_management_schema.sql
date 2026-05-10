-- Rename the request workflow schema to the broader project management schema.
-- Existing migrations intentionally create request_management first; this final
-- migration preserves that history and renames the schema after all additions.

DO $$
BEGIN
  IF to_regnamespace('project_management') IS NULL
     AND to_regnamespace('request_management') IS NOT NULL THEN
    ALTER SCHEMA request_management RENAME TO project_management;
  END IF;
END $$;

GRANT USAGE ON SCHEMA project_management TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA project_management TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA project_management TO service_role;
