-- 오프보딩 체크리스트를 요청마다 새로 만들지 않고, 관리자가 미리 만들어 둔
-- 프리셋을 요청 생성 시점에 복사해서 적용한다.
-- 복사본을 쓰기 때문에 프리셋을 나중에 고쳐도 진행 중인 오프보딩은 영향받지 않는다.

CREATE TABLE public.offboarding_checklist_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 200),
  responsible_party text,
  sort_order integer NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX offboarding_checklist_presets_order_idx
  ON public.offboarding_checklist_presets(is_active, sort_order, created_at);

CREATE TRIGGER set_offboarding_checklist_presets_updated_at
  BEFORE UPDATE ON public.offboarding_checklist_presets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.offboarding_checklist_presets ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_role_all ON public.offboarding_checklist_presets
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 오프보딩 요청이 생기면 활성 프리셋을 그 요청의 체크 항목으로 복사한다.
CREATE OR REPLACE FUNCTION public.apply_offboarding_checklist_presets()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.offboarding_checklist_items (
    offboarding_request_id,
    title,
    responsible_party,
    sort_order
  )
  SELECT NEW.id, preset.title, preset.responsible_party, preset.sort_order
  FROM public.offboarding_checklist_presets AS preset
  WHERE preset.is_active
  ORDER BY preset.sort_order, preset.created_at;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS apply_offboarding_checklist_presets
  ON public.offboarding_requests;
CREATE TRIGGER apply_offboarding_checklist_presets
  AFTER INSERT ON public.offboarding_requests
  FOR EACH ROW EXECUTE FUNCTION public.apply_offboarding_checklist_presets();

NOTIFY pgrst, 'reload schema';
