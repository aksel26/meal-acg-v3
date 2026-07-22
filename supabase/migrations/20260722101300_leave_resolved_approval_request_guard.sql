CREATE OR REPLACE FUNCTION prevent_resolved_approval_approver_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF OLD.related_table = 'dayoffs'
     AND OLD.status IN ('approved', 'rejected')
     AND NEW.status = OLD.status
     AND NEW.approver_id IS DISTINCT FROM OLD.approver_id THEN
    RAISE EXCEPTION 'LEAVE_APPROVER_CHANGE_FORBIDDEN' USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_resolved_approval_approver_change
  ON approval_requests;
CREATE TRIGGER trg_prevent_resolved_approval_approver_change
  BEFORE UPDATE OF approver_id, status
  ON approval_requests
  FOR EACH ROW
  EXECUTE FUNCTION prevent_resolved_approval_approver_change();

REVOKE ALL ON FUNCTION prevent_resolved_approval_approver_change()
  FROM PUBLIC, anon, authenticated;
