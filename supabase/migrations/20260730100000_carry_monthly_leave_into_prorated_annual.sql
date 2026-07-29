CREATE OR REPLACE FUNCTION generate_annual_leave(p_year integer)
RETURNS integer AS $$
DECLARE
  rec              RECORD;
  v_granted        decimal(5,2);
  v_type           text;
  v_hire_year      integer;
  v_years_employed integer;
  v_accrual        integer;
  v_carryover      decimal(5,2);
  v_processed      integer := 0;
BEGIN
  FOR rec IN
    SELECT
      m.id,
      m.hire_date,
      p.annual_leave_days,
      p.leave_accrual_rule
    FROM members m
    JOIN positions p ON p.id = m.position_id
    WHERE NOT EXISTS (
      SELECT 1 FROM member_statuses ms
       WHERE ms.member_id = m.id
         AND ms.status = '퇴사'
         AND ms.start_date <= CURRENT_DATE
         AND (ms.end_date IS NULL OR ms.end_date >= CURRENT_DATE)
    )
    AND m.hire_date IS NOT NULL
  LOOP
    IF rec.annual_leave_days = 0 THEN
      CONTINUE;
    END IF;

    v_hire_year := EXTRACT(YEAR FROM rec.hire_date)::integer;
    IF v_hire_year > p_year THEN
      CONTINUE;
    END IF;

    v_carryover := 0;

    IF v_hire_year = p_year THEN
      v_type := 'monthly';
      v_granted := 12 - EXTRACT(MONTH FROM rec.hire_date)::integer;
    ELSIF v_hire_year = p_year - 1 THEN
      SELECT GREATEST(
        0,
        COALESCE(granted + adjusted - used, 0)
      )
      INTO v_carryover
      FROM leave_balances
      WHERE member_id = rec.id
        AND year = p_year - 1
        AND type = 'monthly';

      v_type := 'annual';
      v_granted :=
        ROUND(
          15.0 * (MAKE_DATE(p_year, 1, 1) - rec.hire_date)::numeric / 365,
          1
        )
        + COALESCE(v_carryover, 0);
    ELSE
      v_type := 'annual';
      v_years_employed := p_year - v_hire_year;
      v_accrual := 0;

      IF rec.leave_accrual_rule = '+1_per_3yr' THEN
        v_accrual := v_years_employed / 3;
      END IF;

      v_granted := rec.annual_leave_days + v_accrual;
    END IF;

    INSERT INTO leave_balances (member_id, year, type, granted)
    VALUES (rec.id, p_year, v_type, v_granted)
    ON CONFLICT (member_id, year, type)
    DO UPDATE SET granted = EXCLUDED.granted, updated_at = now();

    INSERT INTO leave_balances (member_id, year, type, granted)
    VALUES (rec.id, p_year, 'summer', 3)
    ON CONFLICT (member_id, year, type) DO NOTHING;

    v_processed := v_processed + 1;
  END LOOP;

  RETURN v_processed;
END;
$$ LANGUAGE plpgsql;
