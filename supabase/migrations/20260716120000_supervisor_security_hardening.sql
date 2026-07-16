ALTER TABLE supervisor.workers
  ADD COLUMN IF NOT EXISTS resident_id_enc text;

COMMENT ON COLUMN supervisor.workers.resident_id_enc IS
  'AES-256-GCM encrypted resident registration number. New writes must not use resident_id.';

CREATE TABLE IF NOT EXISTS supervisor.auth_rate_limits (
  rate_key text PRIMARY KEY,
  window_started_at timestamptz NOT NULL DEFAULT now(),
  attempts integer NOT NULL DEFAULT 1 CHECK (attempts > 0)
);

REVOKE ALL ON supervisor.auth_rate_limits FROM PUBLIC, anon, authenticated;
GRANT ALL ON supervisor.auth_rate_limits TO service_role;

CREATE OR REPLACE FUNCTION supervisor.consume_auth_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = supervisor, pg_temp
AS $$
DECLARE
  v_now timestamptz := clock_timestamp();
  v_attempts integer;
BEGIN
  IF p_key = '' OR p_limit < 1 OR p_window_seconds < 1 THEN
    RAISE EXCEPTION 'invalid rate limit arguments';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_key, 0));

  INSERT INTO supervisor.auth_rate_limits AS limits (
    rate_key,
    window_started_at,
    attempts
  )
  VALUES (p_key, v_now, 1)
  ON CONFLICT (rate_key) DO UPDATE
  SET window_started_at = CASE
        WHEN limits.window_started_at + make_interval(secs => p_window_seconds) <= v_now
          THEN v_now
        ELSE limits.window_started_at
      END,
      attempts = CASE
        WHEN limits.window_started_at + make_interval(secs => p_window_seconds) <= v_now
          THEN 1
        ELSE limits.attempts + 1
      END
  RETURNING attempts INTO v_attempts;

  RETURN v_attempts <= p_limit;
END;
$$;

REVOKE ALL ON FUNCTION supervisor.consume_auth_rate_limit(text, integer, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION supervisor.consume_auth_rate_limit(text, integer, integer)
  TO service_role;

CREATE TABLE IF NOT EXISTS supervisor.sso_handoffs (
  code_hash text PRIMARY KEY,
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  source_app text NOT NULL CHECK (source_app IN ('user', 'admin')),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_supervisor_sso_handoffs_expires_at
  ON supervisor.sso_handoffs (expires_at);

REVOKE ALL ON supervisor.sso_handoffs FROM PUBLIC, anon, authenticated;
GRANT ALL ON supervisor.sso_handoffs TO service_role;

CREATE OR REPLACE FUNCTION supervisor.consume_sso_handoff(p_code_hash text)
RETURNS TABLE(member_id uuid, source_app text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = supervisor, pg_temp
AS $$
  UPDATE supervisor.sso_handoffs
  SET consumed_at = clock_timestamp()
  WHERE code_hash = p_code_hash
    AND consumed_at IS NULL
    AND expires_at > clock_timestamp()
  RETURNING member_id, source_app;
$$;

REVOKE ALL ON FUNCTION supervisor.consume_sso_handoff(text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION supervisor.consume_sso_handoff(text)
  TO service_role;
