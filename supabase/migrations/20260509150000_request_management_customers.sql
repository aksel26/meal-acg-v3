-- Customer selection support for request management

ALTER TABLE request_management.requests
  ADD COLUMN IF NOT EXISTS customer_names text[] NOT NULL DEFAULT '{}';

