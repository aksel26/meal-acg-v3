-- Affiliate selection support for request management

ALTER TABLE request_management.requests
  ADD COLUMN IF NOT EXISTS affiliate_names text[] NOT NULL DEFAULT '{}';

