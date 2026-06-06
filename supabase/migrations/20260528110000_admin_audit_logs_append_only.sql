-- admin_audit_logs를 append-only로 전환한다.
-- 감사 로그는 사후 변조가 불가능해야 하므로 service_role의 UPDATE/DELETE 권한을 회수한다.
--
-- 주의: Supabase의 service_role은 BYPASSRLS 속성을 가지므로 RLS 정책만으로는
-- service_role의 변조를 막을 수 없다. 실효적 강제는 테이블 GRANT 회수다.
-- RLS 정책도 방어적으로 INSERT/SELECT로 좁혀 둔다.

-- 1) 핵심: service_role의 UPDATE/DELETE 테이블 권한 회수 (append-only 강제)
REVOKE UPDATE, DELETE ON public.admin_audit_logs FROM service_role;

-- 2) RLS 정책을 FOR ALL에서 INSERT/SELECT로 분리 (방어적 정의)
DROP POLICY IF EXISTS "service_role_all" ON public.admin_audit_logs;

CREATE POLICY "service_role_insert" ON public.admin_audit_logs
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "service_role_select" ON public.admin_audit_logs
  FOR SELECT USING (auth.role() = 'service_role');
