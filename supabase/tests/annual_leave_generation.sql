\set ON_ERROR_STOP on

BEGIN;

DO $$
DECLARE
  v_member_id uuid;
  v_adjusted_member_id uuid;
  v_overused_member_id uuid;
  v_regular_member_id uuid;
  v_future_member_id uuid;
  v_granted numeric;
  v_count integer;
BEGIN
  INSERT INTO members (
    login_id,
    password,
    full_name,
    position_id,
    hire_date
  )
  VALUES (
    'annual-leave-generation-test-' || gen_random_uuid(),
    'test-only',
    'Annual Leave Generation Test',
    (SELECT id FROM positions WHERE name = '사원'),
    date '2098-06-15'
  )
  RETURNING id INTO v_member_id;

  INSERT INTO leave_balances (
    member_id,
    year,
    type,
    granted,
    used
  )
  VALUES (
    v_member_id,
    2098,
    'monthly',
    6,
    2.5
  );

  PERFORM generate_annual_leave(2099);

  SELECT granted
  INTO v_granted
  FROM leave_balances
  WHERE member_id = v_member_id
    AND year = 2099
    AND type = 'annual';

  IF v_granted <> 11.7 THEN
    RAISE EXCEPTION
      'previous-year monthly balance was not carried into prorated annual leave: %',
      v_granted;
  END IF;

  INSERT INTO members (
    login_id,
    password,
    full_name,
    position_id,
    hire_date
  )
  VALUES (
    'adjusted-carryover-test-' || gen_random_uuid(),
    'test-only',
    'Adjusted Carryover Test',
    (SELECT id FROM positions WHERE name = '사원'),
    date '2098-09-10'
  )
  RETURNING id INTO v_adjusted_member_id;

  INSERT INTO leave_balances (
    member_id,
    year,
    type,
    granted,
    used,
    adjusted
  )
  VALUES (
    v_adjusted_member_id,
    2098,
    'monthly',
    3,
    1.5,
    0.5
  );

  PERFORM generate_annual_leave(2099);

  SELECT granted
  INTO v_granted
  FROM leave_balances
  WHERE member_id = v_adjusted_member_id
    AND year = 2099
    AND type = 'annual';

  IF v_granted <> 6.6 THEN
    RAISE EXCEPTION
      'adjusted monthly balance was not carried into prorated annual leave: %',
      v_granted;
  END IF;

  INSERT INTO members (
    login_id,
    password,
    full_name,
    position_id,
    hire_date
  )
  VALUES (
    'overused-carryover-test-' || gen_random_uuid(),
    'test-only',
    'Overused Carryover Test',
    (SELECT id FROM positions WHERE name = '사원'),
    date '2098-12-20'
  )
  RETURNING id INTO v_overused_member_id;

  INSERT INTO leave_balances (
    member_id,
    year,
    type,
    granted,
    used
  )
  VALUES (
    v_overused_member_id,
    2098,
    'monthly',
    0,
    0.5
  );

  PERFORM generate_annual_leave(2099);

  SELECT granted
  INTO v_granted
  FROM leave_balances
  WHERE member_id = v_overused_member_id
    AND year = 2099
    AND type = 'annual';

  IF v_granted <> 0.5 THEN
    RAISE EXCEPTION
      'negative monthly balance must be clamped before carryover: %',
      v_granted;
  END IF;

  INSERT INTO members (
    login_id,
    password,
    full_name,
    position_id,
    hire_date
  )
  VALUES (
    'regular-annual-generation-test-' || gen_random_uuid(),
    'test-only',
    'Regular Annual Generation Test',
    (SELECT id FROM positions WHERE name = '사원'),
    date '2097-06-15'
  )
  RETURNING id INTO v_regular_member_id;

  INSERT INTO leave_balances (
    member_id,
    year,
    type,
    granted,
    used
  )
  VALUES (
    v_regular_member_id,
    2098,
    'annual',
    10,
    2
  );

  PERFORM generate_annual_leave(2099);

  SELECT granted
  INTO v_granted
  FROM leave_balances
  WHERE member_id = v_regular_member_id
    AND year = 2099
    AND type = 'annual';

  IF v_granted <> 15 THEN
    RAISE EXCEPTION
      'ordinary annual balance must not carry into regular annual leave: %',
      v_granted;
  END IF;

  INSERT INTO members (
    login_id,
    password,
    full_name,
    position_id,
    hire_date
  )
  VALUES (
    'future-hire-generation-test-' || gen_random_uuid(),
    'test-only',
    'Future Hire Generation Test',
    (SELECT id FROM positions WHERE name = '사원'),
    date '2100-06-15'
  )
  RETURNING id INTO v_future_member_id;

  PERFORM generate_annual_leave(2099);

  SELECT count(*)
  INTO v_count
  FROM leave_balances
  WHERE member_id = v_future_member_id
    AND year = 2099;

  IF v_count <> 0 THEN
    RAISE EXCEPTION
      'leave balances were generated before the member hire year: %',
      v_count;
  END IF;

  RAISE NOTICE 'PASS: 전년도 잔여 월차 3.5일 + 비례연차 8.2일 = 11.7일';
  RAISE NOTICE 'PASS: 조정값 포함 잔여 월차를 비례연차에 합산';
  RAISE NOTICE 'PASS: 음수 잔여 월차는 0일로 이월';
  RAISE NOTICE 'PASS: 일반 연차 잔여는 다음 해 정규연차에 이월하지 않음';
  RAISE NOTICE 'PASS: 입사연도 이전에는 휴가 잔액을 생성하지 않음';
END
$$;

ROLLBACK;
