CREATE OR REPLACE FUNCTION prevent_approved_dayoff_approver_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF OLD.approval_status = 'approved'
     AND NEW.approval_status = 'approved'
     AND NEW.approver_id IS DISTINCT FROM OLD.approver_id THEN
    RAISE EXCEPTION 'LEAVE_APPROVER_CHANGE_FORBIDDEN' USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_approved_dayoff_approver_change ON dayoffs;
CREATE TRIGGER trg_prevent_approved_dayoff_approver_change
  BEFORE UPDATE OF approver_id, approval_status
  ON dayoffs
  FOR EACH ROW
  EXECUTE FUNCTION prevent_approved_dayoff_approver_change();

REVOKE ALL ON FUNCTION prevent_approved_dayoff_approver_change()
  FROM PUBLIC, anon, authenticated;
