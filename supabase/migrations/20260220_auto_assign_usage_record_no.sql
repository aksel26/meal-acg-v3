-- 1) Re-number all existing records sequentially by created_at
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) AS new_no
  FROM usage_records
)
UPDATE usage_records
SET no = ranked.new_no
FROM ranked
WHERE usage_records.id = ranked.id;

-- 2) Auto-assign trigger for new inserts
CREATE OR REPLACE FUNCTION auto_assign_usage_record_no()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.no IS NULL THEN
    PERFORM pg_advisory_xact_lock(hashtext('usage_records_no'));
    SELECT COALESCE(MAX(no), 0) + 1 INTO NEW.no FROM usage_records;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_auto_assign_no
BEFORE INSERT ON usage_records
FOR EACH ROW
EXECUTE FUNCTION auto_assign_usage_record_no();

-- 3) Enforce NOT NULL now that all rows have values
ALTER TABLE usage_records ALTER COLUMN no SET NOT NULL;
