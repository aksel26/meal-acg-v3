-- Rename project_management schema to work as part of the user-app unification effort.
-- Coordinate with code deploy: both apps must reference "work" schema before applying.

DO $$
BEGIN
  IF to_regnamespace('work') IS NULL
     AND to_regnamespace('project_management') IS NOT NULL THEN
    ALTER SCHEMA project_management RENAME TO work;
  END IF;
END $$;

GRANT USAGE ON SCHEMA work TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA work TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA work TO service_role;
