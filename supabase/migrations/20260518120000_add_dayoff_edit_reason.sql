ALTER TABLE public.dayoffs
ADD COLUMN IF NOT EXISTS edit_reason text;

COMMENT ON COLUMN public.dayoffs.edit_reason IS '승인된 근태 수정 사유';
