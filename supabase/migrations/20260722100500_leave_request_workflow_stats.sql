CREATE OR REPLACE FUNCTION get_dayoff_monthly_stats(p_year integer, p_month integer)
RETURNS TABLE (
  member_id uuid, member_name text, team_name text, leave_type_id integer,
  leave_type_name text, count bigint
)
LANGUAGE plpgsql
STABLE
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT d.target_id, m.full_name, t.name, d.leave_type_id, lt.name, count(*)::bigint
  FROM dayoffs d
  JOIN members m ON m.id = d.target_id
  JOIN leave_types lt ON lt.id = d.leave_type_id
  LEFT JOIN teams t ON t.id = m.team_id
  WHERE d.is_deleted = false AND d.approval_status = 'approved'
    AND extract(year FROM d.leave_date) = p_year
    AND extract(month FROM d.leave_date) = p_month
  GROUP BY d.target_id, m.full_name, t.name, d.leave_type_id, lt.name
  ORDER BY m.full_name, d.leave_type_id;
END;
$$;
