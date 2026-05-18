-- Admin RBAC role classification and user-side authority classification.
ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS admin_role text,
  ADD COLUMN IF NOT EXISTS user_authority text;

ALTER TABLE public.members
  DROP CONSTRAINT IF EXISTS members_admin_role_check,
  ADD CONSTRAINT members_admin_role_check
    CHECK (admin_role IS NULL OR admin_role IN ('대표', 'P&C 팀장', 'P&C 일반'));

ALTER TABLE public.members
  DROP CONSTRAINT IF EXISTS members_user_authority_check,
  ADD CONSTRAINT members_user_authority_check
    CHECK (user_authority IS NULL OR user_authority IN ('팀장/본부장', '팀장'));

UPDATE public.members
SET admin_role = '대표'
WHERE role = 'admin'
  AND admin_role IS NULL;
