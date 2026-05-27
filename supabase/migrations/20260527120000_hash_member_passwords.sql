CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.hash_member_password()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
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
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT m.id, m.full_name, m.role
  FROM public.members m
  WHERE m.login_id = p_login_id
    AND m.password = crypt(p_password, m.password);
END;
$$;

CREATE OR REPLACE FUNCTION public.change_member_password(
  p_member_id uuid,
  p_current_password text,
  p_new_password text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  updated_count integer;
BEGIN
  UPDATE public.members
  SET password = p_new_password
  WHERE id = p_member_id
    AND password = crypt(p_current_password, password);

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count = 1;
END;
$$;

GRANT ALL ON FUNCTION public.authenticate_user(text, text) TO anon;
GRANT ALL ON FUNCTION public.authenticate_user(text, text) TO authenticated;
GRANT ALL ON FUNCTION public.authenticate_user(text, text) TO service_role;
GRANT ALL ON FUNCTION public.change_member_password(uuid, text, text) TO service_role;

NOTIFY pgrst, 'reload schema';
