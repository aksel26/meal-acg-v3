DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.budget_allocations
    GROUP BY member_id, type, period
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'DUPLICATE_BUDGET_ALLOCATION_IDENTITY'
      USING ERRCODE = '23505';
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS
  uq_budget_allocations_member_type_period
ON public.budget_allocations(member_id, type, period);
