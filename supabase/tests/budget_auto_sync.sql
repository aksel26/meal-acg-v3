\set ON_ERROR_STOP on

BEGIN;

DO $$
DECLARE
  v_org_id uuid := 'ba000000-0000-0000-0000-000000000001';
  v_division_id uuid := 'ba000000-0000-0000-0000-000000000002';
  v_team_id uuid := 'ba000000-0000-0000-0000-000000000003';
  v_other_team_id uuid := 'ba000000-0000-0000-0000-000000000004';
  v_pnc_team_id uuid := 'ba000000-0000-0000-0000-000000000005';
  v_leader_id uuid := 'ba000000-0000-0000-0000-000000000010';
  v_member_id uuid := 'ba000000-0000-0000-0000-000000000011';
  v_intern_id uuid := 'ba000000-0000-0000-0000-000000000012';
  v_representative_id uuid := 'ba000000-0000-0000-0000-000000000013';
  v_override_representative_id uuid := 'ba000000-0000-0000-0000-000000000014';
  v_pnc_leader_id uuid := 'ba000000-0000-0000-0000-000000000015';
  v_status_id uuid;
  v_amount integer;
  v_base_amount integer;
  v_failed boolean;
  v_current_period text := public.budget_period_for_date(
    (now() AT TIME ZONE 'Asia/Seoul')::date
  );
BEGIN
  INSERT INTO public.organizations(id, name)
  VALUES (v_org_id, '예산 자동 동기화 테스트 조직');

  INSERT INTO public.divisions(id, organization_id, name)
  VALUES (v_division_id, v_org_id, '테스트 본부');

  INSERT INTO public.teams(id, organization_id, division_id, name)
  VALUES
    (v_team_id, v_org_id, v_division_id, '테스트 팀'),
    (v_other_team_id, v_org_id, v_division_id, '외부 팀'),
    (v_pnc_team_id, v_org_id, v_division_id, 'People & Culture');

  INSERT INTO public.members(
    id,
    login_id,
    password,
    full_name,
    organization_id,
    division_id,
    team_id,
    member_role,
    intern_months
  )
  VALUES
    (v_leader_id, 'budget-sync-leader', 'test-only', '테스트 팀장', v_org_id, v_division_id, v_team_id, '팀장', NULL),
    (v_member_id, 'budget-sync-member', 'test-only', '테스트 팀원', v_org_id, v_division_id, v_team_id, '팀원', NULL),
    (v_intern_id, 'budget-sync-intern', 'test-only', '테스트 인턴', v_org_id, v_division_id, v_team_id, '인턴', 3),
    (v_representative_id, 'budget-sync-representative', 'test-only', '테스트 대표', v_org_id, v_division_id, v_team_id, '대표', NULL),
    (v_override_representative_id, 'budget-sync-override-representative', 'test-only', '정진우', v_org_id, v_division_id, v_team_id, '팀장', NULL),
    (v_pnc_leader_id, 'budget-sync-pnc', 'test-only', 'P&C 팀장', v_org_id, v_division_id, v_pnc_team_id, '팀장', NULL);

  IF NOT EXISTS (
    SELECT 1
    FROM public.budget_allocations
    WHERE member_id = v_leader_id
      AND type = '활동비'
      AND period = v_current_period
  ) THEN
    RAISE EXCEPTION '신규 입사자 현재 반기 자동 동기화 실패';
  END IF;

  INSERT INTO public.budget_period_settings(
    period,
    welfare_amount,
    leader_rate,
    manager_rate,
    pnc_extra_rate
  )
  VALUES ('2099-H1', 500000, 200000, 150000, 50000);

  PERFORM public.sync_budget_period('2099-H1', date '2099-03-01');

  SELECT total_amount INTO v_amount
  FROM public.budget_allocations
  WHERE member_id = v_leader_id
    AND type = '활동비'
    AND period = '2099-H1';

  IF v_amount <> 375000 THEN
    RAISE EXCEPTION
      '팀장+팀원+3개월 인턴 계산 불일치: expected 375000, actual %',
      v_amount;
  END IF;

  SELECT total_amount INTO v_amount
  FROM public.budget_allocations
  WHERE member_id = v_representative_id
    AND type = '활동비'
    AND period = '2099-H1';

  IF v_amount <> 0 THEN
    RAISE EXCEPTION '대표 활동비 제외 실패: %', v_amount;
  END IF;

  SELECT total_amount INTO v_amount
  FROM public.budget_allocations
  WHERE member_id = v_override_representative_id
    AND type = '활동비'
    AND period = '2099-H1';

  IF v_amount <> 0 THEN
    RAISE EXCEPTION '정진우 대표 오버라이드 제외 실패: %', v_amount;
  END IF;

  SELECT total_amount INTO v_amount
  FROM public.budget_allocations
  WHERE member_id = v_pnc_leader_id
    AND type = '활동비'
    AND period = '2099-H1';

  IF v_amount <> 225000 THEN
    RAISE EXCEPTION
      'P&C 외부 팀원+인턴 계산 불일치: expected 225000, actual %',
      v_amount;
  END IF;

  INSERT INTO public.member_statuses(
    member_id,
    status,
    start_date,
    end_date
  )
  VALUES (
    v_member_id,
    '휴직',
    date '2099-04-01',
    date '2099-04-30'
  )
  RETURNING id INTO v_status_id;

  PERFORM public.sync_budget_period('2099-H1', date '2099-03-01');

  SELECT total_amount INTO v_amount
  FROM public.budget_allocations
  WHERE member_id = v_member_id
    AND type = '복지포인트'
    AND period = '2099-H1';

  IF v_amount <> 500000 THEN
    RAISE EXCEPTION '미래 상태가 현재 복지포인트를 제외함: %', v_amount;
  END IF;

  UPDATE public.member_statuses
  SET start_date = date '2099-02-01',
      end_date = date '2099-03-31'
  WHERE id = v_status_id;

  PERFORM public.sync_budget_period('2099-H1', date '2099-03-01');

  SELECT total_amount, base_amount
  INTO v_amount, v_base_amount
  FROM public.budget_allocations
  WHERE member_id = v_member_id
    AND type = '복지포인트'
    AND period = '2099-H1';

  IF v_amount <> 0 OR v_base_amount <> 500000 THEN
    RAISE EXCEPTION
      '현재 상태의 복지포인트 제외/원액 보존 실패: total %, base %',
      v_amount,
      v_base_amount;
  END IF;

  DELETE FROM public.member_statuses WHERE id = v_status_id;
  PERFORM public.sync_budget_period('2099-H1', date '2099-03-01');

  SELECT total_amount INTO v_amount
  FROM public.budget_allocations
  WHERE member_id = v_member_id
    AND type = '복지포인트'
    AND period = '2099-H1';

  IF v_amount <> 500000 THEN
    RAISE EXCEPTION '상태 해제 후 복지포인트 복원 실패: %', v_amount;
  END IF;

  INSERT INTO public.member_statuses(
    member_id,
    status,
    start_date,
    end_date
  )
  VALUES (
    v_member_id,
    '휴직',
    date '2099-01-01',
    date '2099-01-31'
  );

  PERFORM public.sync_budget_period('2099-H1', date '2099-03-01');

  SELECT total_amount INTO v_amount
  FROM public.budget_allocations
  WHERE member_id = v_member_id
    AND type = '복지포인트'
    AND period = '2099-H1';

  IF v_amount <> 500000 THEN
    RAISE EXCEPTION '종료 상태가 현재 복지포인트를 제외함: %', v_amount;
  END IF;

  v_failed := false;
  BEGIN
    UPDATE public.members SET intern_months = 7 WHERE id = v_intern_id;
  EXCEPTION WHEN check_violation THEN
    v_failed := true;
  END;

  IF NOT v_failed THEN
    RAISE EXCEPTION '7개월 인턴 저장이 허용됨';
  END IF;

  v_failed := false;
  BEGIN
    UPDATE public.members SET intern_months = 1 WHERE id = v_member_id;
  EXCEPTION WHEN check_violation THEN
    v_failed := true;
  END;

  IF NOT v_failed THEN
    RAISE EXCEPTION '비인턴의 intern_months 저장이 허용됨';
  END IF;

  DELETE FROM public.members WHERE id = v_member_id;
  PERFORM public.sync_budget_period('2099-H1', date '2099-03-01');

  SELECT total_amount INTO v_amount
  FROM public.budget_allocations
  WHERE member_id = v_leader_id
    AND type = '활동비'
    AND period = '2099-H1';

  IF v_amount <> 225000 THEN
    RAISE EXCEPTION
      '팀원 삭제 후 활동비 재계산 불일치: expected 225000, actual %',
      v_amount;
  END IF;
END;
$$;

ROLLBACK;
