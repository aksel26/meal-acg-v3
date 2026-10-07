-- 구성원 비밀번호를 bcrypt 해시로 저장한다.
-- 기존 평문은 그 자리에서 해시로 바꾸므로 사용자는 같은 비밀번호를 그대로 쓴다.
-- pgcrypto가 public이든 extensions든 찾을 수 있게 search_path에 둘 다 넣는다.

SET search_path TO public, extensions;

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.hash_member_password()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  IF NEW.password IS NOT NULL
    AND (TG_OP = 'INSERT' OR NEW.password IS DISTINCT FROM OLD.password)
    AND NEW.password !~ '^\$2[aby]\$'
  THEN
    NEW.password := crypt(NEW.password, gen_salt('bf'));
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_hash_member_password ON public.members;

CREATE TRIGGER trg_hash_member_password
  BEFORE INSERT OR UPDATE OF password ON public.members
  FOR EACH ROW
  EXECUTE FUNCTION public.hash_member_password();

UPDATE public.members
SET password = crypt(password, gen_salt('bf'))
WHERE password IS NOT NULL
  AND password !~ '^\$2[aby]\$';

CREATE OR REPLACE FUNCTION public.authenticate_user(
  p_login_id text,
  p_password text
) RETURNS TABLE(user_id uuid, full_name text, role text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  RETURN QUERY
  SELECT m.id, m.full_name, m.role
  FROM public.members m
  WHERE m.login_id = p_login_id
    AND m.password = crypt(p_password, m.password);
END;
$$;

GRANT ALL ON FUNCTION public.authenticate_user(text, text) TO anon;
GRANT ALL ON FUNCTION public.authenticate_user(text, text) TO authenticated;
GRANT ALL ON FUNCTION public.authenticate_user(text, text) TO service_role;

-- 평문이 하나라도 남으면 전체를 되돌린다.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.members
    WHERE password IS NOT NULL AND password !~ '^\$2[aby]\$'
  ) THEN
    RAISE EXCEPTION '평문 비밀번호가 남아 있습니다. 마이그레이션을 중단합니다.';
  END IF;
END;
$$;

NOTIFY pgrst, 'reload schema';
