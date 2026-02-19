-- Add 'no' column to usage_records table
-- This column stores the sequential number from Excel column A (No.)
-- Used for ordering records in descending display (higher No. = newer = at top)

ALTER TABLE usage_records ADD COLUMN no INTEGER;

-- Add index for performance (no is used for sorting)
CREATE INDEX idx_usage_records_no ON usage_records(no DESC NULLS LAST);
