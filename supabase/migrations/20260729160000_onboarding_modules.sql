-- 온보딩 모듈. 오프보딩과 같은 구조(요청 + 체크 항목 + 프리셋)를 쓰되,
-- 입사에는 승인 단계가 없으므로 진행 중 → 완료/취소 흐름만 둔다.

CREATE TABLE public.onboarding_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  status text NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('in_progress', 'completed', 'cancelled')),
  note text,
  admin_note text,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (status = 'completed' AND completed_at IS NOT NULL)
    OR (status <> 'completed' AND completed_at IS NULL)
  )
);

CREATE UNIQUE INDEX onboarding_requests_one_open_per_member
  ON public.onboarding_requests(member_id)
  WHERE status = 'in_progress';
CREATE INDEX onboarding_requests_member_created_idx
  ON public.onboarding_requests(member_id, created_at DESC);
CREATE INDEX onboarding_requests_status_date_idx
  ON public.onboarding_requests(status, start_date);

CREATE TABLE public.onboarding_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  onboarding_request_id uuid NOT NULL
    REFERENCES public.onboarding_requests(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 200),
  description text,
  responsible_party text,
  is_completed boolean NOT NULL DEFAULT false,
  completion_note text,
  completed_at timestamptz,
  sort_order integer NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (is_completed AND completed_at IS NOT NULL)
    OR (NOT is_completed AND completed_at IS NULL)
  )
);

CREATE INDEX onboarding_checklist_request_idx
  ON public.onboarding_checklist_items(onboarding_request_id, sort_order, created_at);

CREATE TABLE public.onboarding_checklist_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 200),
  description text,
  responsible_party text,
  sort_order integer NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX onboarding_checklist_presets_order_idx
  ON public.onboarding_checklist_presets(is_active, sort_order, created_at);

-- 완료/취소된 온보딩의 체크 항목은 더 이상 손대지 못하게 막는다.
CREATE OR REPLACE FUNCTION public.guard_onboarding_checklist_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_request_id uuid;
  v_status text;
BEGIN
  v_request_id := CASE
    WHEN TG_OP = 'DELETE' THEN OLD.onboarding_request_id
    ELSE NEW.onboarding_request_id
  END;

  SELECT status
  INTO v_status
  FROM public.onboarding_requests
  WHERE id = v_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ONBOARDING_REQUEST_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;
  IF v_status <> 'in_progress' THEN
    RAISE EXCEPTION 'ONBOARDING_CHECKLIST_LOCKED' USING ERRCODE = '22023';
  END IF;

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

CREATE TRIGGER guard_onboarding_checklist_mutation
  BEFORE INSERT OR UPDATE OR DELETE ON public.onboarding_checklist_items
  FOR EACH ROW EXECUTE FUNCTION public.guard_onboarding_checklist_mutation();

-- 진행 중인 온보딩만 완료할 수 있고, 남은 체크 항목이 있으면 거부한다.
CREATE OR REPLACE FUNCTION public.complete_onboarding_request(p_request_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
BEGIN
  SELECT status
  INTO v_status
  FROM public.onboarding_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ONBOARDING_REQUEST_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;
  IF v_status <> 'in_progress' THEN
    RAISE EXCEPTION 'ONBOARDING_REQUEST_NOT_OPEN' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM public.onboarding_checklist_items
    WHERE onboarding_request_id = p_request_id
      AND is_completed = false
  ) THEN
    RAISE EXCEPTION 'ONBOARDING_CHECKLIST_INCOMPLETE' USING ERRCODE = '22023';
  END IF;

  UPDATE public.onboarding_requests
  SET status = 'completed',
      completed_at = now()
  WHERE id = p_request_id;

  RETURN p_request_id;
END;
$$;

-- 온보딩이 생기면 활성 프리셋을 그 온보딩의 체크 항목으로 복사한다.
CREATE OR REPLACE FUNCTION public.apply_onboarding_checklist_presets()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.onboarding_checklist_items (
    onboarding_request_id,
    title,
    description,
    responsible_party,
    sort_order
  )
  SELECT
    NEW.id,
    preset.title,
    preset.description,
    preset.responsible_party,
    preset.sort_order
  FROM public.onboarding_checklist_presets AS preset
  WHERE preset.is_active
  ORDER BY preset.sort_order, preset.created_at;

  RETURN NEW;
END;
$$;

CREATE TRIGGER apply_onboarding_checklist_presets
  AFTER INSERT ON public.onboarding_requests
  FOR EACH ROW EXECUTE FUNCTION public.apply_onboarding_checklist_presets();

-- 신규 인원이 등록되면 온보딩을 자동으로 만든다.
CREATE OR REPLACE FUNCTION public.sync_onboarding_from_member()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.onboarding_requests
    WHERE member_id = NEW.id
  ) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.onboarding_requests (member_id, start_date)
  VALUES (NEW.id, COALESCE(NEW.hire_date, CURRENT_DATE))
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_onboarding_from_member
  AFTER INSERT ON public.members
  FOR EACH ROW EXECUTE FUNCTION public.sync_onboarding_from_member();

CREATE TRIGGER set_onboarding_requests_updated_at
  BEFORE UPDATE ON public.onboarding_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_onboarding_checklist_items_updated_at
  BEFORE UPDATE ON public.onboarding_checklist_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_onboarding_checklist_presets_updated_at
  BEFORE UPDATE ON public.onboarding_checklist_presets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.onboarding_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_checklist_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_role_all ON public.onboarding_requests
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY service_role_all ON public.onboarding_checklist_items
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY service_role_all ON public.onboarding_checklist_presets
  FOR ALL TO service_role USING (true) WITH CHECK (true);

REVOKE ALL ON FUNCTION public.complete_onboarding_request(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_onboarding_request(uuid)
  TO service_role;

NOTIFY pgrst, 'reload schema';
