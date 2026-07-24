-- 20260724130003_leave_history_field_guard.sql
-- prevent_approved_dayoff_approver_change() 가드 강화:
-- 확정 상태(approved/rejected)가 "유지"되는 동안에는 approver_id 뿐 아니라
-- first_approver_id / final_approver_id 직접 UPDATE도 차단한다.
-- (기존 20260722101100/101200 은 approver_id 변경만 막았고, 트리거 자체가
--  approver_id/approval_status 컬럼에만 걸려 있어 first/final_approver_id
--  단독 UPDATE는 트리거가 발동조차 하지 않았다.)
--
-- 상태-불변 조건(NEW.approval_status = OLD.approval_status)은 그대로 유지한다.
-- resolve_leave_approval_atomic RPC 의 cancel(approved/rejected → pending)과
-- revert(pre_approved → pending)는 approval_status 자체가 바뀌므로 이 가드에
-- 걸리지 않아야 정상이다.

CREATE OR REPLACE FUNCTION prevent_approved_dayoff_approver_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF OLD.approval_status IN ('approved', 'rejected')
     AND NEW.approval_status = OLD.approval_status
     AND (
       NEW.approver_id IS DISTINCT FROM OLD.approver_id
       OR NEW.first_approver_id IS DISTINCT FROM OLD.first_approver_id
       OR NEW.final_approver_id IS DISTINCT FROM OLD.final_approver_id
     ) THEN
    RAISE EXCEPTION 'LEAVE_APPROVER_CHANGE_FORBIDDEN' USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END;
$$;

-- 트리거의 UPDATE OF 컬럼 목록에 first_approver_id/final_approver_id를 추가해야
-- 해당 컬럼만 단독으로 바뀌는 UPDATE에서도 트리거가 실제로 발동한다.
DROP TRIGGER IF EXISTS trg_prevent_approved_dayoff_approver_change ON dayoffs;
CREATE TRIGGER trg_prevent_approved_dayoff_approver_change
  BEFORE UPDATE OF approver_id, approval_status, first_approver_id, final_approver_id
  ON dayoffs
  FOR EACH ROW
  EXECUTE FUNCTION prevent_approved_dayoff_approver_change();

REVOKE ALL ON FUNCTION prevent_approved_dayoff_approver_change()
  FROM PUBLIC, anon, authenticated;
