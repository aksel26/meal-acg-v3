CREATE OR REPLACE FUNCTION delete_dayoff_atomic(
  p_dayoff_id uuid,
  p_actor_id uuid,
  p_is_admin boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_dayoff dayoffs%ROWTYPE;
BEGIN
  SELECT * INTO v_dayoff FROM dayoffs
  WHERE id = p_dayoff_id AND is_deleted = false FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'LEAVE_DAYOFF_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;
  IF NOT p_is_admin AND v_dayoff.author_id <> p_actor_id
     AND v_dayoff.target_id <> p_actor_id THEN
    RAISE EXCEPTION 'LEAVE_DAYOFF_FORBIDDEN' USING ERRCODE = '42501';
  END IF;
  UPDATE dayoffs SET is_deleted = true, last_editor_id = p_actor_id
  WHERE id = p_dayoff_id;
  UPDATE approval_requests
  SET status = 'rejected', reject_reason = '휴가 삭제',
      resolved_at = now(), resolved_by = p_actor_id
  WHERE related_table = 'dayoffs' AND related_id = p_dayoff_id;
END;
$$;
