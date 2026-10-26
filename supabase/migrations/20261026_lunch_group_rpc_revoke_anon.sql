-- 점심조 RPC를 service_role만 호출할 수 있게 한다.
-- 20261026_lunch_group_integrity.sql의 `revoke ... from public`만으로는 부족하다.
-- Supabase 기본 권한(ALTER DEFAULT PRIVILEGES)이 함수 생성 시 anon·authenticated에
-- execute를 따로 부여하므로 그 둘에서 명시적으로 회수해야 한다.

revoke execute on function public.assign_lunch_group(uuid, date) from anon, authenticated;
revoke execute on function public.move_lunch_group_member(date, uuid, integer, uuid) from anon, authenticated;
