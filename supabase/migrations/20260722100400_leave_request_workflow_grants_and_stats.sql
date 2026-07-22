DO $$
BEGIN
  EXECUTE 'REVOKE ALL ON FUNCTION create_leave_request_atomic(uuid, uuid, uuid, uuid, date[], integer, text, text, uuid[], text, text) FROM PUBLIC, anon, authenticated';
  EXECUTE 'REVOKE ALL ON FUNCTION resolve_leave_approval_atomic(uuid, uuid, text, boolean, text) FROM PUBLIC, anon, authenticated';
  EXECUTE 'REVOKE ALL ON FUNCTION update_dayoff_atomic(uuid, uuid, boolean, jsonb) FROM PUBLIC, anon, authenticated';
  EXECUTE 'REVOKE ALL ON FUNCTION delete_dayoff_atomic(uuid, uuid, boolean) FROM PUBLIC, anon, authenticated';
  EXECUTE 'GRANT EXECUTE ON FUNCTION create_leave_request_atomic(uuid, uuid, uuid, uuid, date[], integer, text, text, uuid[], text, text) TO service_role';
  EXECUTE 'GRANT EXECUTE ON FUNCTION resolve_leave_approval_atomic(uuid, uuid, text, boolean, text) TO service_role';
  EXECUTE 'GRANT EXECUTE ON FUNCTION update_dayoff_atomic(uuid, uuid, boolean, jsonb) TO service_role';
  EXECUTE 'GRANT EXECUTE ON FUNCTION delete_dayoff_atomic(uuid, uuid, boolean) TO service_role';
END;
$$;
