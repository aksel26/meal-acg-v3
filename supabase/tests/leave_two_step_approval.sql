\set ON_ERROR_STOP on

BEGIN;

DO $$
DECLARE
  v_member_id uuid := gen_random_uuid();
  v_first_approver_id uuid := gen_random_uuid();
  v_final_approver_id uuid := gen_random_uuid();
  v_dayoff1_id uuid;
  v_approval1_id uuid;
  v_dayoff2_id uuid;
  v_approval2_id uuid;
  v_dayoff3_id uuid;
  v_approval3_id uuid;
  v_used numeric;
  v_dayoff_status text;
  v_approval_status text;
  v_expected_error boolean;
BEGIN
  INSERT INTO members (id, login_id, password, full_name)
  VALUES
    (v_member_id, 'leave-two-step-' || v_member_id, 'test-only', 'Leave Two Step Member'),
    (v_first_approver_id, 'leave-two-step-' || v_first_approver_id, 'test-only', 'Leave Two Step First Approver'),
    (v_final_approver_id, 'leave-two-step-' || v_final_approver_id, 'test-only', 'Leave Two Step Final Approver');

  -- Existing seed rows are out of scope; assertions below use this test's generated IDs.

  INSERT INTO leave_balances(member_id, year, type, granted, used)
  VALUES (v_member_id, 2099, 'annual', 20, 0)
  ON CONFLICT (member_id, year, type)
  DO UPDATE SET granted = 20, used = 0;

  -- ============ dayoff1: pre_approve → approve 정상 흐름 (시나리오 1,2,3,4,5,9a,9b) ============
  SELECT dayoff_id, approval_id
  INTO v_dayoff1_id, v_approval1_id
  FROM create_leave_request_atomic(
    gen_random_uuid(), v_member_id, v_member_id, v_first_approver_id,
    ARRAY[date '2099-03-05'], 5, NULL, NULL, '{}', '2단계 승인 테스트 1', 'pending'
  );

  -- 시나리오 1: pre_approve 시 pending → pre_approved, first_approver_id 세팅
  PERFORM resolve_leave_approval_atomic(v_approval1_id, v_first_approver_id, 'pre_approve', true, NULL);

  SELECT approval_status INTO v_dayoff_status FROM dayoffs WHERE id = v_dayoff1_id;
  IF v_dayoff_status <> 'pre_approved' THEN
    RAISE EXCEPTION '시나리오 1 실패: pre_approve 후 상태가 pre_approved 가 아님 (%)', v_dayoff_status;
  END IF;
  IF (SELECT first_approver_id FROM dayoffs WHERE id = v_dayoff1_id) <> v_first_approver_id
     OR (SELECT first_approved_at FROM dayoffs WHERE id = v_dayoff1_id) IS NULL THEN
    RAISE EXCEPTION '시나리오 1 실패: first_approver_id/first_approved_at 미설정';
  END IF;
  RAISE NOTICE 'PASS 1: pre_approve 시 pending -> pre_approved, first_approver_id 세팅';

  -- 시나리오 9a: pre_approve 후 dayoffs.approval_status == approval_requests.status
  SELECT status INTO v_approval_status FROM approval_requests WHERE id = v_approval1_id;
  IF v_dayoff_status <> v_approval_status THEN
    RAISE EXCEPTION '시나리오 9a 실패: dayoffs(%) / approval_requests(%) 상태 불일치', v_dayoff_status, v_approval_status;
  END IF;
  RAISE NOTICE 'PASS 9a: pre_approve 후 상태 동기화 확인';

  -- 시나리오 4: pre_approve 시점에 연차 차감 (used +1)
  SELECT used INTO v_used FROM leave_balances
  WHERE member_id = v_member_id AND year = 2099 AND type = 'annual';
  IF v_used <> 1 THEN
    RAISE EXCEPTION '시나리오 4 실패: pre_approve 후 used = % (기대 1)', v_used;
  END IF;
  RAISE NOTICE 'PASS 4: pre_approve 시점에 연차 used +1 차감';

  -- 시나리오 3: 동일인 금지 — first_approver 가 최종 approve 시도 시 LEAVE_SAME_APPROVER_FORBIDDEN
  v_expected_error := false;
  BEGIN
    PERFORM resolve_leave_approval_atomic(v_approval1_id, v_first_approver_id, 'approve', true, NULL);
  EXCEPTION WHEN insufficient_privilege THEN
    v_expected_error := SQLERRM = 'LEAVE_SAME_APPROVER_FORBIDDEN';
  END;
  IF NOT v_expected_error THEN
    RAISE EXCEPTION '시나리오 3 실패: 동일인 최종승인이 차단되지 않음';
  END IF;
  -- 차단된 시도가 상태/잔액을 변경하지 않았는지 확인
  SELECT approval_status INTO v_dayoff_status FROM dayoffs WHERE id = v_dayoff1_id;
  SELECT used INTO v_used FROM leave_balances
  WHERE member_id = v_member_id AND year = 2099 AND type = 'annual';
  IF v_dayoff_status <> 'pre_approved' OR v_used <> 1 THEN
    RAISE EXCEPTION '시나리오 3 실패: 차단된 시도가 상태/잔액을 변경함 (status=%, used=%)', v_dayoff_status, v_used;
  END IF;
  RAISE NOTICE 'PASS 3: 동일인 최종승인 차단 (LEAVE_SAME_APPROVER_FORBIDDEN)';

  -- 시나리오 2: approve(다른 actor) 시 pre_approved → approved, final_approver_id 세팅
  PERFORM resolve_leave_approval_atomic(v_approval1_id, v_final_approver_id, 'approve', true, NULL);
  SELECT approval_status INTO v_dayoff_status FROM dayoffs WHERE id = v_dayoff1_id;
  IF v_dayoff_status <> 'approved' THEN
    RAISE EXCEPTION '시나리오 2 실패: approve 후 상태가 approved 가 아님 (%)', v_dayoff_status;
  END IF;
  IF (SELECT final_approver_id FROM dayoffs WHERE id = v_dayoff1_id) <> v_final_approver_id
     OR (SELECT final_approved_at FROM dayoffs WHERE id = v_dayoff1_id) IS NULL THEN
    RAISE EXCEPTION '시나리오 2 실패: final_approver_id/final_approved_at 미설정';
  END IF;
  RAISE NOTICE 'PASS 2: approve(다른 actor) 시 pre_approved -> approved, final_approver_id 세팅';

  -- 시나리오 9b: approve 후 dayoffs.approval_status == approval_requests.status
  SELECT status INTO v_approval_status FROM approval_requests WHERE id = v_approval1_id;
  IF v_dayoff_status <> v_approval_status THEN
    RAISE EXCEPTION '시나리오 9b 실패: dayoffs(%) / approval_requests(%) 상태 불일치', v_dayoff_status, v_approval_status;
  END IF;
  RAISE NOTICE 'PASS 9b: approve 후 상태 동기화 확인';

  -- 시나리오 5: pre_approved → approved 전이 시 이중차감 없음 (used 그대로)
  SELECT used INTO v_used FROM leave_balances
  WHERE member_id = v_member_id AND year = 2099 AND type = 'annual';
  IF v_used <> 1 THEN
    RAISE EXCEPTION '시나리오 5 실패: approve 후 used = % (기대 1, 이중차감 발생)', v_used;
  END IF;
  RAISE NOTICE 'PASS 5: pre_approved -> approved 전이 시 이중차감 없음';

  -- ============ dayoff2: pre_approved 상태에서 식대차단 + reject 복원 (시나리오 6,7,9c) ============
  SELECT dayoff_id, approval_id
  INTO v_dayoff2_id, v_approval2_id
  FROM create_leave_request_atomic(
    gen_random_uuid(), v_member_id, v_member_id, v_first_approver_id,
    ARRAY[date '2099-03-06'], 5, NULL, NULL, '{}', '2단계 승인 테스트 2', 'pending'
  );
  PERFORM resolve_leave_approval_atomic(v_approval2_id, v_first_approver_id, 'pre_approve', true, NULL);

  SELECT used INTO v_used FROM leave_balances
  WHERE member_id = v_member_id AND year = 2099 AND type = 'annual';
  IF v_used <> 2 THEN
    RAISE EXCEPTION '시나리오 6/7 사전조건 실패: dayoff2 pre_approve 후 used = % (기대 2)', v_used;
  END IF;

  -- 시나리오 7: pre_approved 휴가일 meal_logs insert 차단
  v_expected_error := false;
  BEGIN
    INSERT INTO meal_logs(user_id, entry_date, attendance, lunch_amount)
    VALUES (v_member_id, date '2099-03-06', '근무', 7000);
  EXCEPTION WHEN check_violation THEN
    v_expected_error := SQLERRM = 'APPROVED_LEAVE_MEAL_FORBIDDEN';
  END;
  IF NOT v_expected_error THEN
    RAISE EXCEPTION '시나리오 7 실패: pre_approved 휴가일 식대입력이 차단되지 않음';
  END IF;
  RAISE NOTICE 'PASS 7: pre_approved 휴가일 식대입력 차단 (APPROVED_LEAVE_MEAL_FORBIDDEN)';

  -- 시나리오 6: reject(pre_approved) 시 used -1 복원
  PERFORM resolve_leave_approval_atomic(v_approval2_id, v_first_approver_id, 'reject', true, '테스트 반려');
  SELECT approval_status INTO v_dayoff_status FROM dayoffs WHERE id = v_dayoff2_id;
  IF v_dayoff_status <> 'rejected' THEN
    RAISE EXCEPTION '시나리오 6 실패: reject 후 상태가 rejected 가 아님 (%)', v_dayoff_status;
  END IF;
  SELECT used INTO v_used FROM leave_balances
  WHERE member_id = v_member_id AND year = 2099 AND type = 'annual';
  IF v_used <> 1 THEN
    RAISE EXCEPTION '시나리오 6 실패: reject 후 used = % (기대 1, dayoff1 승인분만 남아야 함)', v_used;
  END IF;
  RAISE NOTICE 'PASS 6: reject(pre_approved) 시 used -1 복원';

  -- 시나리오 9c: reject 후 dayoffs.approval_status == approval_requests.status
  SELECT status INTO v_approval_status FROM approval_requests WHERE id = v_approval2_id;
  IF v_dayoff_status <> v_approval_status THEN
    RAISE EXCEPTION '시나리오 9c 실패: dayoffs(%) / approval_requests(%) 상태 불일치', v_dayoff_status, v_approval_status;
  END IF;
  RAISE NOTICE 'PASS 9c: reject 후 상태 동기화 확인';

  -- ============ dayoff3: 잘못된 전이 pending → approve (시나리오 8) ============
  SELECT dayoff_id, approval_id
  INTO v_dayoff3_id, v_approval3_id
  FROM create_leave_request_atomic(
    gen_random_uuid(), v_member_id, v_member_id, v_first_approver_id,
    ARRAY[date '2099-03-07'], 5, NULL, NULL, '{}', '2단계 승인 테스트 3', 'pending'
  );

  v_expected_error := false;
  BEGIN
    PERFORM resolve_leave_approval_atomic(v_approval3_id, v_final_approver_id, 'approve', true, NULL);
  EXCEPTION WHEN invalid_parameter_value THEN
    v_expected_error := SQLERRM = 'LEAVE_INVALID_TRANSITION';
  END;
  IF NOT v_expected_error THEN
    RAISE EXCEPTION '시나리오 8 실패: pending -> approve 직행이 차단되지 않음';
  END IF;
  SELECT approval_status INTO v_dayoff_status FROM dayoffs WHERE id = v_dayoff3_id;
  IF v_dayoff_status <> 'pending' THEN
    RAISE EXCEPTION '시나리오 8 실패: 차단된 시도가 상태를 변경함 (%)', v_dayoff_status;
  END IF;
  RAISE NOTICE 'PASS 8: 잘못된 전이(pending -> approve) 차단 (LEAVE_INVALID_TRANSITION)';

  RAISE NOTICE '모든 시나리오(1-9) PASS';
END;
$$;

ROLLBACK;
