-- Keep admin permission tier separate from organization role/title.
-- Admin app access is limited to P&C users; labels are representative, leader, and general.
ALTER TABLE public.members
  DROP CONSTRAINT IF EXISTS members_admin_role_check;

UPDATE public.members
SET admin_role = CASE admin_role
  WHEN 'P&C 팀장' THEN '팀장'
  WHEN 'P&C 일반' THEN '일반'
  ELSE admin_role
END
WHERE admin_role IN ('P&C 팀장', 'P&C 일반');

ALTER TABLE public.members
  ADD CONSTRAINT members_admin_role_check
    CHECK (admin_role IS NULL OR admin_role IN ('대표', '팀장', '일반'));

UPDATE public.members
SET admin_role = '일반'
WHERE role = 'admin'
  AND admin_role IS NULL;

UPDATE public.members
SET admin_role = '대표',
    member_role = '대표'
WHERE login_id = 'admin';

NOTIFY pgrst, 'reload schema';
