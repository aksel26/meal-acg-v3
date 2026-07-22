CREATE OR REPLACE FUNCTION prevent_approved_dayoff_approver_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF OLD.approval_status IN ('approved', 'rejected')
     AND NEW.approval_status = OLD.approval_status
     AND NEW.approver_id IS DISTINCT FROM OLD.approver_id THEN
    RAISE EXCEPTION 'LEAVE_APPROVER_CHANGE_FORBIDDEN' USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION prevent_approved_dayoff_approver_change()
  FROM PUBLIC, anon, authenticated;
