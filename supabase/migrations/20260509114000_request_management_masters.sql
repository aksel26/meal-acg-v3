-- Request management master fields for MVP UI

ALTER TABLE request_management.requests
  ADD COLUMN IF NOT EXISTS request_type text,
  ADD COLUMN IF NOT EXISTS request_type_name text;
