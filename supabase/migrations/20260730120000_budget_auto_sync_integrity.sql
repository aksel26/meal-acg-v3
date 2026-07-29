CREATE TABLE IF NOT EXISTS public.budget_period_settings (
  period text PRIMARY KEY
    CHECK (period ~ '^[0-9]{4}-H[12]$'),
  welfare_amount integer NOT NULL DEFAULT 0
    CHECK (welfare_amount >= 0),
  leader_rate integer NOT NULL DEFAULT 200000
    CHECK (leader_rate >= 0),
  manager_rate integer NOT NULL DEFAULT 150000
    CHECK (manager_rate >= 0),
  pnc_extra_rate integer NOT NULL DEFAULT 50000
    CHECK (pnc_extra_rate >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.budget_period_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS service_role_all_budget_period_settings
  ON public.budget_period_settings;
CREATE POLICY service_role_all_budget_period_settings
  ON public.budget_period_settings
  TO service_role
  USING (true)
  WITH CHECK (true);

GRANT ALL ON TABLE public.budget_period_settings TO service_role;

ALTER TABLE public.budget_allocations
  ADD COLUMN IF NOT EXISTS base_amount integer;

UPDATE public.budget_allocations
SET base_amount = total_amount
WHERE base_amount IS NULL;

ALTER TABLE public.budget_allocations
  ALTER COLUMN base_amount SET DEFAULT 0,
  ALTER COLUMN base_amount SET NOT NULL;

ALTER TABLE public.budget_allocations
  DROP CONSTRAINT IF EXISTS budget_allocations_base_amount_nonnegative;
ALTER TABLE public.budget_allocations
  ADD CONSTRAINT budget_allocations_base_amount_nonnegative
  CHECK (base_amount >= 0);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.members
    WHERE member_role = '인턴'
      AND intern_months IS NOT NULL
      AND intern_months NOT BETWEEN 1 AND 6
  ) THEN
    RAISE EXCEPTION 'INVALID_EXISTING_INTERN_MONTHS';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.members
    WHERE member_role <> '인턴'
      AND intern_months IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'NON_INTERN_WITH_INTERN_MONTHS';
  END IF;
END;
$$;

-- 기존 로직은 개월 수가 없는 인턴을 1개월로 계산했다.
UPDATE public.members
SET intern_months = 1
WHERE member_role = '인턴'
  AND intern_months IS NULL;

UPDATE public.members
SET intern_months = NULL
WHERE member_role <> '인턴'
  AND intern_months IS NOT NULL;

ALTER TABLE public.members
  DROP CONSTRAINT IF EXISTS members_intern_months_consistency;
ALTER TABLE public.members
  ADD CONSTRAINT members_intern_months_consistency
  CHECK (
    (member_role = '인턴' AND intern_months BETWEEN 1 AND 6)
    OR
    (member_role <> '인턴' AND intern_months IS NULL)
  );

CREATE OR REPLACE FUNCTION public.budget_period_for_date(p_date date)
RETURNS text
LANGUAGE sql
IMMUTABLE
STRICT
SET search_path = public
AS $$
  SELECT extract(year FROM p_date)::integer::text
    || CASE WHEN extract(month FROM p_date) <= 6 THEN '-H1' ELSE '-H2' END;
$$;

CREATE OR REPLACE FUNCTION public.parse_budget_description_amount(
  p_description text,
  p_pattern text
)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v_matches text[];
BEGIN
  IF p_description IS NULL THEN
    RETURN NULL;
  END IF;

  v_matches := regexp_match(p_description, p_pattern);
  IF v_matches IS NULL OR v_matches[1] IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN replace(v_matches[1], ',', '')::integer;
EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
  RETURN NULL;
END;
$$;

WITH periods AS (
  SELECT DISTINCT period
  FROM public.budget_allocations
  UNION
  SELECT public.budget_period_for_date(
    (now() AT TIME ZONE 'Asia/Seoul')::date
  )
)
INSERT INTO public.budget_period_settings(
  period,
  welfare_amount,
  leader_rate,
  manager_rate,
  pnc_extra_rate
)
SELECT
  periods.period,
  COALESCE(
    (
      SELECT mode() WITHIN GROUP (ORDER BY ba.total_amount)
      FROM public.budget_allocations ba
      WHERE ba.period = periods.period
        AND ba.type = '복지포인트'
        AND ba.total_amount > 0
    ),
    0
  ),
  COALESCE(
    (
      SELECT public.parse_budget_description_amount(
        ba.description,
        '^([0-9,]+)원'
      )
      FROM public.budget_allocations ba
      JOIN public.members m ON m.id = ba.member_id
      WHERE ba.period = periods.period
        AND ba.type = '활동비'
        AND m.member_role = '본부장'
        AND public.parse_budget_description_amount(
          ba.description,
          '^([0-9,]+)원'
        ) IS NOT NULL
      ORDER BY ba.updated_at DESC
      LIMIT 1
    ),
    200000
  ),
  COALESCE(
    (
      SELECT public.parse_budget_description_amount(
        ba.description,
        '본인 ([0-9,]+)원'
      )
      FROM public.budget_allocations ba
      JOIN public.members m ON m.id = ba.member_id
      WHERE ba.period = periods.period
        AND ba.type = '활동비'
        AND m.member_role = '팀장'
        AND public.parse_budget_description_amount(
          ba.description,
          '본인 ([0-9,]+)원'
        ) IS NOT NULL
      ORDER BY ba.updated_at DESC
      LIMIT 1
    ),
    150000
  ),
  COALESCE(
    (
      SELECT COALESCE(
        public.parse_budget_description_amount(
          ba.description,
          '([0-9,]+)원 × [0-9]+명 \(팀원\)'
        ),
        public.parse_budget_description_amount(
          ba.description,
          '인턴 [^ ]+ ([0-9,]+)원/6×'
        )
      )
      FROM public.budget_allocations ba
      JOIN public.members m ON m.id = ba.member_id
      JOIN public.teams t ON t.id = m.team_id
      WHERE ba.period = periods.period
        AND ba.type = '활동비'
        AND (
          t.name ILIKE '%People & Culture%'
          OR t.name ILIKE '%P&C%'
        )
        AND COALESCE(
          public.parse_budget_description_amount(
            ba.description,
            '([0-9,]+)원 × [0-9]+명 \(팀원\)'
          ),
          public.parse_budget_description_amount(
            ba.description,
            '인턴 [^ ]+ ([0-9,]+)원/6×'
          )
        ) IS NOT NULL
      ORDER BY ba.updated_at DESC
      LIMIT 1
    ),
    50000
  )
FROM periods
ON CONFLICT (period) DO NOTHING;

UPDATE public.budget_allocations ba
SET base_amount = settings.welfare_amount
FROM public.budget_period_settings settings
WHERE ba.period = settings.period
  AND ba.type = '복지포인트'
  AND ba.base_amount = 0
  AND settings.welfare_amount > 0
  AND EXISTS (
    SELECT 1
    FROM public.member_statuses ms
    WHERE ms.member_id = ba.member_id
      AND ms.start_date <= (now() AT TIME ZONE 'Asia/Seoul')::date
      AND (
        ms.end_date IS NULL
        OR ms.end_date >= (now() AT TIME ZONE 'Asia/Seoul')::date
      )
  );

DROP FUNCTION public.parse_budget_description_amount(text, text);

CREATE OR REPLACE FUNCTION public.sync_budget_period(
  p_period text,
  p_business_date date DEFAULT (now() AT TIME ZONE 'Asia/Seoul')::date
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_settings public.budget_period_settings%ROWTYPE;
BEGIN
  IF p_period !~ '^[0-9]{4}-H[12]$' THEN
    RAISE EXCEPTION 'INVALID_BUDGET_PERIOD';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('budget-sync:' || p_period));

  INSERT INTO public.budget_period_settings(
    period,
    welfare_amount,
    leader_rate,
    manager_rate,
    pnc_extra_rate
  )
  SELECT
    p_period,
    COALESCE(
      (
        SELECT mode() WITHIN GROUP (ORDER BY ba.base_amount)
        FROM public.budget_allocations ba
        WHERE ba.period = p_period
          AND ba.type = '복지포인트'
          AND ba.base_amount > 0
      ),
      0
    ),
    200000,
    150000,
    50000
  ON CONFLICT (period) DO NOTHING;

  SELECT *
  INTO STRICT v_settings
  FROM public.budget_period_settings
  WHERE period = p_period;

  INSERT INTO public.budget_allocations(
    member_id,
    type,
    period,
    base_amount,
    total_amount,
    description
  )
  SELECT
    m.id,
    '복지포인트',
    p_period,
    v_settings.welfare_amount,
    CASE
      WHEN EXISTS (
        SELECT 1
        FROM public.member_statuses ms
        WHERE ms.member_id = m.id
          AND ms.start_date <= p_business_date
          AND (ms.end_date IS NULL OR ms.end_date >= p_business_date)
      ) THEN 0
      ELSE v_settings.welfare_amount
    END,
    '반기 기준 자동 배정'
  FROM public.members m
  ON CONFLICT (member_id, type, period) DO UPDATE
  SET
    total_amount = CASE
      WHEN EXISTS (
        SELECT 1
        FROM public.member_statuses ms
        WHERE ms.member_id = EXCLUDED.member_id
          AND ms.start_date <= p_business_date
          AND (ms.end_date IS NULL OR ms.end_date >= p_business_date)
      ) THEN 0
      ELSE public.budget_allocations.base_amount
    END,
    updated_at = now();

  WITH effective_members AS (
    SELECT
      m.id,
      m.full_name,
      m.organization_id,
      m.team_id,
      t.name AS team_name,
      CASE
        WHEN m.full_name = '정진우' THEN '대표'
        ELSE m.member_role::text
      END AS effective_role,
      m.intern_months,
      EXISTS (
        SELECT 1
        FROM public.member_statuses ms
        WHERE ms.member_id = m.id
          AND ms.start_date <= p_business_date
          AND (ms.end_date IS NULL OR ms.end_date >= p_business_date)
      ) AS has_active_status
    FROM public.members m
    LEFT JOIN public.teams t ON t.id = m.team_id
  ),
  pnc_team AS (
    SELECT DISTINCT ON (em.organization_id)
      em.organization_id,
      em.team_id
    FROM effective_members em
    WHERE em.effective_role IN ('팀장', '본부장')
      AND em.team_id IS NOT NULL
      AND (
        em.team_name ILIKE '%People & Culture%'
        OR em.team_name ILIKE '%P&C%'
      )
    ORDER BY em.organization_id, em.id
  ),
  team_stats AS (
    SELECT
      em.team_id,
      count(*) FILTER (
        WHERE NOT em.has_active_status
          AND em.effective_role <> '대표'
          AND em.effective_role <> '인턴'
      )::integer AS member_count,
      COALESCE(
        sum(
          CASE
            WHEN NOT em.has_active_status
              AND em.effective_role = '인턴'
            THEN round(
              v_settings.manager_rate::numeric / 6 * em.intern_months
            )::integer
            ELSE 0
          END
        ),
        0
      )::integer AS intern_amount
    FROM effective_members em
    WHERE em.team_id IS NOT NULL
    GROUP BY em.team_id
  ),
  pnc_extra AS (
    SELECT
      pt.organization_id,
      pt.team_id,
      count(*) FILTER (
        WHERE em.effective_role = '팀원'
      )::integer AS staff_count,
      COALESCE(
        sum(
          CASE
            WHEN em.effective_role = '인턴'
            THEN round(
              v_settings.pnc_extra_rate::numeric / 6 * em.intern_months
            )::integer
            ELSE 0
          END
        ),
        0
      )::integer AS intern_amount
    FROM pnc_team pt
    LEFT JOIN effective_members em
      ON em.organization_id = pt.organization_id
      AND NOT em.has_active_status
      AND em.effective_role IN ('팀원', '인턴')
      AND em.team_id IS NOT NULL
      AND em.team_id <> pt.team_id
    GROUP BY pt.organization_id, pt.team_id
  ),
  calculated AS (
    SELECT
      em.id AS member_id,
      em.has_active_status,
      em.effective_role,
      CASE
        WHEN em.effective_role = '본부장' THEN
          greatest(COALESCE(ts.member_count, 0), 1)
            * v_settings.leader_rate
          + COALESCE(ts.intern_amount, 0)
        WHEN em.effective_role = '팀장'
          AND em.organization_id = pt.organization_id
          AND em.team_id = pt.team_id THEN
          greatest(COALESCE(ts.member_count, 0), 1)
            * v_settings.manager_rate
          + COALESCE(ts.intern_amount, 0)
          + COALESCE(pe.staff_count, 0) * v_settings.pnc_extra_rate
          + COALESCE(pe.intern_amount, 0)
        WHEN em.effective_role = '팀장' THEN
          greatest(COALESCE(ts.member_count, 0), 1)
            * v_settings.manager_rate
          + COALESCE(ts.intern_amount, 0)
        ELSE 0
      END::integer AS base_amount,
      CASE
        WHEN em.effective_role = '본부장' THEN format(
          '%s원 × %s명%s',
          to_char(v_settings.leader_rate, 'FM999,999,999'),
          greatest(COALESCE(ts.member_count, 0), 1),
          CASE
            WHEN COALESCE(ts.intern_amount, 0) > 0
            THEN format(
              ' + 인턴 비례 %s원',
              to_char(ts.intern_amount, 'FM999,999,999')
            )
            ELSE ''
          END
        )
        WHEN em.effective_role = '팀장'
          AND em.organization_id = pt.organization_id
          AND em.team_id = pt.team_id THEN format(
          '본인/팀 %s원 × %s명 + 외부 팀원 %s원 × %s명%s%s',
          to_char(v_settings.manager_rate, 'FM999,999,999'),
          greatest(COALESCE(ts.member_count, 0), 1),
          to_char(v_settings.pnc_extra_rate, 'FM999,999,999'),
          COALESCE(pe.staff_count, 0),
          CASE
            WHEN COALESCE(ts.intern_amount, 0) > 0
            THEN format(
              ' + 소속 인턴 비례 %s원',
              to_char(ts.intern_amount, 'FM999,999,999')
            )
            ELSE ''
          END,
          CASE
            WHEN COALESCE(pe.intern_amount, 0) > 0
            THEN format(
              ' + 외부 인턴 비례 %s원',
              to_char(pe.intern_amount, 'FM999,999,999')
            )
            ELSE ''
          END
        )
        WHEN em.effective_role = '팀장' THEN format(
          '본인/팀 %s원 × %s명%s',
          to_char(v_settings.manager_rate, 'FM999,999,999'),
          greatest(COALESCE(ts.member_count, 0), 1),
          CASE
            WHEN COALESCE(ts.intern_amount, 0) > 0
            THEN format(
              ' + 인턴 비례 %s원',
              to_char(ts.intern_amount, 'FM999,999,999')
            )
            ELSE ''
          END
        )
        ELSE NULL
      END AS description
    FROM effective_members em
    LEFT JOIN team_stats ts ON ts.team_id = em.team_id
    LEFT JOIN pnc_team pt
      ON pt.organization_id = em.organization_id
    LEFT JOIN pnc_extra pe
      ON pe.organization_id = em.organization_id
      AND pe.team_id = pt.team_id
  )
  INSERT INTO public.budget_allocations(
    member_id,
    type,
    period,
    base_amount,
    total_amount,
    description
  )
  SELECT
    calculated.member_id,
    '활동비',
    p_period,
    calculated.base_amount,
    CASE
      WHEN calculated.has_active_status
        OR calculated.effective_role = '대표'
      THEN 0
      ELSE calculated.base_amount
    END,
    calculated.description
  FROM calculated
  ON CONFLICT (member_id, type, period) DO UPDATE
  SET
    base_amount = EXCLUDED.base_amount,
    total_amount = EXCLUDED.total_amount,
    description = EXCLUDED.description,
    updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.save_budget_period_settings(
  p_period text,
  p_welfare_amount integer DEFAULT NULL,
  p_leader_rate integer DEFAULT NULL,
  p_manager_rate integer DEFAULT NULL,
  p_pnc_extra_rate integer DEFAULT NULL,
  p_welfare_description text DEFAULT NULL
)
RETURNS public.budget_period_settings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result public.budget_period_settings;
BEGIN
  IF p_period !~ '^[0-9]{4}-H[12]$'
    OR p_welfare_amount < 0
    OR p_leader_rate < 0
    OR p_manager_rate < 0
    OR p_pnc_extra_rate < 0
  THEN
    RAISE EXCEPTION 'INVALID_BUDGET_SETTINGS';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('budget-sync:' || p_period));

  INSERT INTO public.budget_period_settings(
    period,
    welfare_amount,
    leader_rate,
    manager_rate,
    pnc_extra_rate
  )
  VALUES (
    p_period,
    COALESCE(p_welfare_amount, 0),
    COALESCE(p_leader_rate, 200000),
    COALESCE(p_manager_rate, 150000),
    COALESCE(p_pnc_extra_rate, 50000)
  )
  ON CONFLICT (period) DO UPDATE
  SET
    welfare_amount = COALESCE(
      p_welfare_amount,
      public.budget_period_settings.welfare_amount
    ),
    leader_rate = COALESCE(
      p_leader_rate,
      public.budget_period_settings.leader_rate
    ),
    manager_rate = COALESCE(
      p_manager_rate,
      public.budget_period_settings.manager_rate
    ),
    pnc_extra_rate = COALESCE(
      p_pnc_extra_rate,
      public.budget_period_settings.pnc_extra_rate
    ),
    updated_at = now();

  IF p_welfare_amount IS NOT NULL THEN
    UPDATE public.budget_allocations
    SET
      base_amount = p_welfare_amount,
      description = COALESCE(
        p_welfare_description,
        description,
        '반기 기준 자동 배정'
      ),
      updated_at = now()
    WHERE period = p_period
      AND type = '복지포인트';
  END IF;

  PERFORM public.sync_budget_period(
    p_period,
    (now() AT TIME ZONE 'Asia/Seoul')::date
  );

  SELECT *
  INTO STRICT v_result
  FROM public.budget_period_settings
  WHERE period = p_period;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_current_budget_period_from_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business_date date := (now() AT TIME ZONE 'Asia/Seoul')::date;
BEGIN
  PERFORM public.sync_budget_period(
    public.budget_period_for_date(v_business_date),
    v_business_date
  );
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS sync_budget_after_member_insert_delete
  ON public.members;
CREATE TRIGGER sync_budget_after_member_insert_delete
AFTER INSERT OR DELETE ON public.members
FOR EACH STATEMENT
EXECUTE FUNCTION public.sync_current_budget_period_from_change();

DROP TRIGGER IF EXISTS sync_budget_after_member_budget_fields
  ON public.members;
CREATE TRIGGER sync_budget_after_member_budget_fields
AFTER UPDATE OF
  full_name,
  organization_id,
  team_id,
  member_role,
  intern_months,
  position_id
ON public.members
FOR EACH STATEMENT
EXECUTE FUNCTION public.sync_current_budget_period_from_change();

DROP TRIGGER IF EXISTS sync_budget_after_status_insert_delete
  ON public.member_statuses;
CREATE TRIGGER sync_budget_after_status_insert_delete
AFTER INSERT OR DELETE ON public.member_statuses
FOR EACH STATEMENT
EXECUTE FUNCTION public.sync_current_budget_period_from_change();

DROP TRIGGER IF EXISTS sync_budget_after_status_budget_fields
  ON public.member_statuses;
CREATE TRIGGER sync_budget_after_status_budget_fields
AFTER UPDATE OF status, start_date, end_date
ON public.member_statuses
FOR EACH STATEMENT
EXECUTE FUNCTION public.sync_current_budget_period_from_change();

CREATE OR REPLACE VIEW public.member_current_status AS
SELECT
  m.id AS member_id,
  m.full_name,
  m.member_role,
  m.email,
  m.login_id,
  m.birth_date,
  m.phone,
  m.passport_number,
  m.created_at,
  m.team_id,
  m.division_id,
  t.name AS team_name,
  d.name AS division_name,
  ms.id AS status_id,
  ms.status AS current_status,
  ms.start_date AS status_start_date,
  ms.end_date AS status_end_date,
  ms.note AS status_note,
  m.position_id,
  m.title_id,
  p.name AS position_name,
  ti.name AS title_name
FROM public.members m
LEFT JOIN public.teams t ON m.team_id = t.id
LEFT JOIN public.divisions d ON m.division_id = d.id
LEFT JOIN public.positions p ON m.position_id = p.id
LEFT JOIN public.titles ti ON m.title_id = ti.id
LEFT JOIN LATERAL (
  SELECT member_status.*
  FROM public.member_statuses member_status
  WHERE member_status.member_id = m.id
    AND member_status.start_date
      <= (now() AT TIME ZONE 'Asia/Seoul')::date
    AND (
      member_status.end_date IS NULL
      OR member_status.end_date
        >= (now() AT TIME ZONE 'Asia/Seoul')::date
    )
  ORDER BY member_status.start_date DESC, member_status.created_at DESC
  LIMIT 1
) ms ON true;

ALTER VIEW public.member_current_status OWNER TO postgres;

CREATE OR REPLACE VIEW public.budget_summary AS
SELECT
  ba.id AS allocation_id,
  ba.member_id,
  m.full_name AS member_name,
  m.member_role,
  t.name AS team_name,
  d.name AS division_name,
  ba.type,
  ba.period,
  ba.total_amount,
  ba.description,
  COALESCE(sum(ur.amount), 0::bigint)::integer AS used_amount,
  (
    ba.total_amount - COALESCE(sum(ur.amount), 0::bigint)
  )::integer AS remaining_amount,
  count(ur.id)::integer AS usage_count,
  count(ur.id) FILTER (WHERE ur.is_reviewed = true)::integer AS reviewed_count,
  ba.base_amount
FROM public.budget_allocations ba
JOIN public.members m ON ba.member_id = m.id
LEFT JOIN public.teams t ON m.team_id = t.id
LEFT JOIN public.divisions d ON m.division_id = d.id
LEFT JOIN public.usage_records ur ON ur.allocation_id = ba.id
GROUP BY
  ba.id,
  ba.member_id,
  m.full_name,
  m.member_role,
  t.name,
  d.name,
  ba.type,
  ba.period,
  ba.total_amount,
  ba.description,
  ba.base_amount;

ALTER VIEW public.budget_summary OWNER TO postgres;

REVOKE ALL ON FUNCTION public.sync_budget_period(text, date)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.save_budget_period_settings(
  text,
  integer,
  integer,
  integer,
  integer,
  text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_budget_period(text, date)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.save_budget_period_settings(
  text,
  integer,
  integer,
  integer,
  integer,
  text
) TO service_role;

SELECT public.sync_budget_period(
  public.budget_period_for_date(
    (now() AT TIME ZONE 'Asia/Seoul')::date
  ),
  (now() AT TIME ZONE 'Asia/Seoul')::date
);

NOTIFY pgrst, 'reload schema';
