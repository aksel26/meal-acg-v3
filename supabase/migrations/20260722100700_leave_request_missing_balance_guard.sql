CREATE OR REPLACE FUNCTION apply_leave_balance_delta(
  p_member_id uuid,
  p_leave_date date,
  p_leave_type_id integer,
  p_multiplier numeric
)
RETURNS void
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_amount numeric(5,2);
  v_balance_id uuid;
  v_year integer := extract(year FROM p_leave_date)::integer;
BEGIN
  SELECT CASE
           WHEN deducts_annual THEN deduction_amount * p_multiplier
           ELSE 0
         END
  INTO v_amount
  FROM leave_types
  WHERE id = p_leave_type_id;

  IF coalesce(v_amount, 0) = 0 THEN
    RETURN;
  END IF;

  SELECT id
  INTO v_balance_id
  FROM leave_balances
  WHERE member_id = p_member_id
    AND year = v_year
    AND type = 'annual'
  LIMIT 1
  FOR UPDATE;

  IF v_balance_id IS NULL THEN
    SELECT id
    INTO v_balance_id
    FROM leave_balances
    WHERE member_id = p_member_id
      AND year = v_year
      AND type = 'monthly'
    LIMIT 1
    FOR UPDATE;
  END IF;

  IF v_balance_id IS NULL THEN
    RAISE EXCEPTION 'LEAVE_BALANCE_NOT_FOUND' USING ERRCODE = 'P0001';
  END IF;

  UPDATE leave_balances
  SET used = greatest(0, used + v_amount),
      updated_at = now()
  WHERE id = v_balance_id;
END;
$$;
