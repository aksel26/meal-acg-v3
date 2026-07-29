-- 체크리스트 단계마다 제목과 함께 세부내용을 남길 수 있게 한다.

ALTER TABLE public.offboarding_checklist_presets
  ADD COLUMN description text;
ALTER TABLE public.offboarding_checklist_items
  ADD COLUMN description text;

-- 프리셋을 복사할 때 세부내용도 함께 옮긴다.
CREATE OR REPLACE FUNCTION public.apply_offboarding_checklist_presets()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.offboarding_checklist_items (
    offboarding_request_id,
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
  FROM public.offboarding_checklist_presets AS preset
  WHERE preset.is_active
  ORDER BY preset.sort_order, preset.created_at;

  RETURN NEW;
END;
$$;

NOTIFY pgrst, 'reload schema';
