\set ON_ERROR_STOP on

BEGIN;

DO $$
DECLARE
  v_member_id uuid;
  v_activity_id uuid := gen_random_uuid();
  v_welfare_id uuid := gen_random_uuid();
  v_total integer;
  v_used integer;
  v_remaining integer;
  v_expected_error boolean;
BEGIN
  INSERT INTO members (login_id, password, full_name)
  SELECT 'benefit-test-' || gen_random_uuid(), 'test-only', 'Benefit Test'
  FROM generate_series(1, greatest(0, 1 - (SELECT count(*) FROM members)));

  SELECT id INTO v_member_id FROM members ORDER BY id LIMIT 1;
  IF v_member_id IS NULL THEN
    RAISE EXCEPTION 'benefit value test requires a seeded member';
  END IF;

  DELETE FROM budget_allocations
  WHERE member_id = v_member_id
    AND period = '2099-H1';

  INSERT INTO budget_allocations(id, member_id, type, period, total_amount)
  VALUES
    (v_activity_id, v_member_id, '활동비', '2099-H1', 300000),
    (v_welfare_id, v_member_id, '복지포인트', '2099-H1', 500000);

  INSERT INTO usage_records(
    allocation_id,
    member_id,
    type,
    amount,
    description,
    used_at
  )
  VALUES
    (v_activity_id, v_member_id, '활동비', 120000, '공통 값 회귀 테스트', date '2099-01-10'),
    (v_welfare_id, v_member_id, '복지포인트', 80000, '공통 값 회귀 테스트', date '2099-02-10');

  SELECT total_amount, used_amount, remaining_amount
  INTO v_total, v_used, v_remaining
  FROM budget_summary
  WHERE allocation_id = v_activity_id;

  IF v_total <> 300000 OR v_used <> 120000 OR v_remaining <> 180000 THEN
    RAISE EXCEPTION
      'activity summary mismatch: total %, used %, remaining %',
      v_total,
      v_used,
      v_remaining;
  END IF;

  SELECT total_amount, used_amount, remaining_amount
  INTO v_total, v_used, v_remaining
  FROM budget_summary
  WHERE allocation_id = v_welfare_id;

  IF v_total <> 500000 OR v_used <> 80000 OR v_remaining <> 420000 THEN
    RAISE EXCEPTION
      'welfare summary mismatch: total %, used %, remaining %',
      v_total,
      v_used,
      v_remaining;
  END IF;

  v_expected_error := false;
  BEGIN
    INSERT INTO usage_records(
      allocation_id,
      member_id,
      type,
      amount,
      description,
      used_at
    )
    VALUES (
      v_welfare_id,
      v_member_id,
      '복지포인트',
      -1,
      '잘못된 금액 회귀 테스트',
      date '2099-02-11'
    );
  EXCEPTION WHEN check_violation THEN
    v_expected_error := true;
  END;

  IF NOT v_expected_error THEN
    RAISE EXCEPTION 'non-positive usage amount was allowed';
  END IF;

  v_expected_error := false;
  BEGIN
    INSERT INTO budget_allocations(member_id, type, period, total_amount)
    VALUES (v_member_id, '복지포인트', '2099-H1', 1);
  EXCEPTION WHEN unique_violation THEN
    v_expected_error := true;
  END;

  IF NOT v_expected_error THEN
    RAISE EXCEPTION 'duplicate budget allocation identity was allowed';
  END IF;
END;
$$;

ROLLBACK;
