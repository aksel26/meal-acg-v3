REVOKE ALL ON TABLE dayoffs FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE approval_requests FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE leave_balances FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION apply_leave_balance_delta(uuid, date, integer, numeric)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION update_leave_balance_on_dayoff()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION prevent_duplicate_active_dayoff()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION prevent_duplicate_dayoff_approval_request()
  FROM PUBLIC, anon, authenticated;

GRANT ALL ON TABLE dayoffs TO service_role;
GRANT ALL ON TABLE approval_requests TO service_role;
GRANT ALL ON TABLE leave_balances TO service_role;
GRANT EXECUTE ON FUNCTION apply_leave_balance_delta(uuid, date, integer, numeric)
  TO service_role;
