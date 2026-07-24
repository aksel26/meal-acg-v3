-- 20260724130001_leave_two_step_approval_rpc.sql
-- ============ SECTION 2: 승인 RPC 2단계 확장 ============
-- resolve_leave_approval_atomic 를 pre_approve/approve/reject/revert/cancel
-- 5개 action으로 확장한다. Task 1(20260724130000)이 이미 로컬에 적용된 뒤라
-- 별도 신규 마이그레이션 파일로 분리 (기적용 파일 수정은 migration up 이 재적용하지 않음).
--
-- 현행 함수(20260722100100_leave_request_workflow_operations.sql) 대비 보존한 것:
--   - 시그니처: resolve_leave_approval_atomic(p_approval_id, p_actor_id, p_action,
--     p_require_assigned_approver default true, p_reject_reason default null)
--   - RETURNS SETOF approval_requests (RETURNING * INTO / RETURN NEXT 패턴)
--   - SECURITY DEFINER, search_path 고정
--   - approval_requests 조회 시 related_table = 'dayoffs' 필터 + FOR UPDATE
--   - dayoffs 조회 시 is_deleted 체크 + FOR UPDATE
--   - reject_reason 은 nullif(btrim(...), '') 로 정규화
--   - 예외명 LEAVE_APPROVAL_NOT_FOUND / LEAVE_DAYOFF_NOT_FOUND / LEAVE_APPROVAL_FORBIDDEN /
--     LEAVE_APPROVAL_NOT_RESOLVED(cancel 전용, "기존대로") 는 그대로 유지
--
-- 새로 도입한 것 (브리핑 골격 + 작업 지시의 "요구 로직" 요구사항 그대로):
--   - action 집합 확장: pre_approve / approve / reject / revert / cancel
--   - LEAVE_INVALID_TRANSITION(22023): pre_approve/approve/reject/revert 의 상태 위반
--     (cancel 은 기존 관례대로 LEAVE_APPROVAL_NOT_RESOLVED 유지)
--   - LEAVE_INVALID_ACTION(22023): 알 수 없는 action (기존 LEAVE_APPROVAL_INVALID_ACTION 대체)
--   - LEAVE_SAME_APPROVER_FORBIDDEN(42501): 최종승인자가 1차 가승인자와 동일할 때
--   - 지정 승인자 검증(LEAVE_APPROVAL_FORBIDDEN)은 pre_approve 에서만 강제한다.
--     approve(최종)는 원래 다른 담당자가 처리하므로 이 체크를 적용하면 2단계 흐름 자체가
--     막히고(동일인 금지 체크와 모순), reject 는 pending/pre_approved 양쪽 단계에서
--     서로 다른 담당자가 처리할 수 있어(설계문서: "팀장(pending) / P&C(둘 다)") 강제하지 않는다.

CREATE OR REPLACE FUNCTION resolve_leave_approval_atomic(
  p_approval_id uuid,
  p_actor_id uuid,
  p_action text,
  p_require_assigned_approver boolean DEFAULT true,
  p_reject_reason text DEFAULT NULL
)
RETURNS SETOF approval_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_approval approval_requests%ROWTYPE;
  v_dayoff dayoffs%ROWTYPE;
  v_now timestamptz := now();
BEGIN
  IF p_action NOT IN ('pre_approve', 'approve', 'reject', 'revert', 'cancel') THEN
    RAISE EXCEPTION 'LEAVE_INVALID_ACTION' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_approval
  FROM approval_requests
  WHERE id = p_approval_id
    AND related_table = 'dayoffs'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'LEAVE_APPROVAL_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  -- 지정 승인자 검증: pre_approve 에서만 강제 (관리자 대행 시 호출부가 false 전달)
  IF p_require_assigned_approver AND p_action = 'pre_approve'
     AND v_approval.approver_id <> p_actor_id THEN
    RAISE EXCEPTION 'LEAVE_APPROVAL_FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_dayoff
  FROM dayoffs
  WHERE id = v_approval.related_id
  FOR UPDATE;

  IF NOT FOUND OR v_dayoff.is_deleted THEN
    RAISE EXCEPTION 'LEAVE_DAYOFF_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF p_action = 'pre_approve' THEN
    IF v_dayoff.approval_status <> 'pending' THEN
      RAISE EXCEPTION 'LEAVE_INVALID_TRANSITION' USING ERRCODE = '22023';
    END IF;

    UPDATE dayoffs
    SET approval_status = 'pre_approved',
        first_approver_id = p_actor_id,
        first_approved_at = v_now
    WHERE id = v_dayoff.id;

    UPDATE approval_requests
    SET status = 'pre_approved'
    WHERE id = v_approval.id
    RETURNING * INTO v_approval;

  ELSIF p_action = 'approve' THEN
    IF v_dayoff.approval_status <> 'pre_approved' THEN
      RAISE EXCEPTION 'LEAVE_INVALID_TRANSITION' USING ERRCODE = '22023';
    END IF;

    IF v_dayoff.first_approver_id = p_actor_id THEN
      RAISE EXCEPTION 'LEAVE_SAME_APPROVER_FORBIDDEN' USING ERRCODE = '42501';
    END IF;

    UPDATE dayoffs
    SET approval_status = 'approved',
        final_approver_id = p_actor_id,
        final_approved_at = v_now,
        approver_id = p_actor_id,   -- 하위호환: approver_id = 최종승인자
        approved_at = v_now
    WHERE id = v_dayoff.id;

    UPDATE approval_requests
    SET status = 'approved',
        resolved_at = v_now,
        resolved_by = p_actor_id
    WHERE id = v_approval.id
    RETURNING * INTO v_approval;

  ELSIF p_action = 'reject' THEN
    IF v_dayoff.approval_status NOT IN ('pending', 'pre_approved') THEN
      RAISE EXCEPTION 'LEAVE_INVALID_TRANSITION' USING ERRCODE = '22023';
    END IF;

    UPDATE dayoffs
    SET approval_status = 'rejected'
    WHERE id = v_dayoff.id;

    UPDATE approval_requests
    SET status = 'rejected',
        reject_reason = nullif(btrim(p_reject_reason), ''),
        resolved_at = v_now,
        resolved_by = p_actor_id
    WHERE id = v_approval.id
    RETURNING * INTO v_approval;

  ELSIF p_action = 'revert' THEN   -- 가승인 취소
    IF v_dayoff.approval_status <> 'pre_approved' THEN
      RAISE EXCEPTION 'LEAVE_INVALID_TRANSITION' USING ERRCODE = '22023';
    END IF;

    UPDATE dayoffs
    SET approval_status = 'pending',
        first_approver_id = NULL,
        first_approved_at = NULL
    WHERE id = v_dayoff.id;

    UPDATE approval_requests
    SET status = 'pending',
        resolved_at = NULL,
        resolved_by = NULL
    WHERE id = v_approval.id
    RETURNING * INTO v_approval;

  ELSIF p_action = 'cancel' THEN   -- approved/rejected 되돌리기 (관리자, 기존 로직 그대로)
    IF v_dayoff.approval_status NOT IN ('approved', 'rejected') THEN
      RAISE EXCEPTION 'LEAVE_APPROVAL_NOT_RESOLVED' USING ERRCODE = '22023';
    END IF;

    UPDATE dayoffs
    SET approval_status = 'pending',
        first_approver_id = NULL,
        first_approved_at = NULL,
        final_approver_id = NULL,
        final_approved_at = NULL,
        approver_id = NULL,
        approved_at = NULL
    WHERE id = v_dayoff.id;

    UPDATE approval_requests
    SET status = 'pending',
        reject_reason = NULL,
        resolved_at = NULL,
        resolved_by = NULL
    WHERE id = v_approval.id
    RETURNING * INTO v_approval;
  END IF;

  RETURN NEXT v_approval;
END;
$$;
