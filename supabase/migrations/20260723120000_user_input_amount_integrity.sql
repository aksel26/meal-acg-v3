DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.meal_logs
    WHERE coalesce(breakfast_amount, 0) < 0
       OR coalesce(lunch_amount, 0) < 0
       OR coalesce(dinner_amount, 0) < 0
  ) THEN
    RAISE EXCEPTION
      'meal_logs contains negative amounts; fix the rows before applying this migration';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.usage_records
    WHERE amount <= 0
  ) THEN
    RAISE EXCEPTION
      'usage_records contains non-positive amounts; fix the rows before applying this migration';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.meal_logs'::regclass
      AND conname = 'meal_logs_nonnegative_amounts'
  ) THEN
    ALTER TABLE public.meal_logs
      ADD CONSTRAINT meal_logs_nonnegative_amounts
      CHECK (
        coalesce(breakfast_amount, 0) >= 0
        AND coalesce(lunch_amount, 0) >= 0
        AND coalesce(dinner_amount, 0) >= 0
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.usage_records'::regclass
      AND conname = 'usage_records_positive_amount'
  ) THEN
    ALTER TABLE public.usage_records
      ADD CONSTRAINT usage_records_positive_amount
      CHECK (amount > 0);
  END IF;
END;
$$;
