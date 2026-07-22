ALTER TABLE dayoffs
  ADD COLUMN IF NOT EXISTS request_fingerprint text;

CREATE OR REPLACE FUNCTION prevent_duplicate_active_dayoff()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.is_deleted = false
     AND NEW.approval_status IN ('pending', 'approved') THEN
    -- 서로 다른 request_id로 동시에 같은 날짜를 신청해도 검사 순서를 직렬화한다.
    PERFORM pg_advisory_xact_lock(
      hashtextextended(NEW.target_id::text || ':' || NEW.leave_date::text, 0)
    );

    IF EXISTS (
      SELECT 1
      FROM dayoffs d
      WHERE d.target_id = NEW.target_id
        AND d.leave_date = NEW.leave_date
        AND d.is_deleted = false
        AND d.approval_status IN ('pending', 'approved')
        AND d.id <> NEW.id
    ) THEN
      RAISE EXCEPTION 'LEAVE_REQUEST_DUPLICATE_DATE' USING ERRCODE = '23505';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
