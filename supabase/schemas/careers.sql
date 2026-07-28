CREATE SCHEMA IF NOT EXISTS careers;

-- careers tables, active-only process ordering, RPCs, and indexes are migration-owned
-- because schema files run before migrations.
