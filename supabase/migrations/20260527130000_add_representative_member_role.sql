ALTER TYPE public.member_role ADD VALUE IF NOT EXISTS '대표' BEFORE '본부장';

NOTIFY pgrst, 'reload schema';
