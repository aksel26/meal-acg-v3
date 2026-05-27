CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES public.members(id) ON DELETE SET NULL,
  actor_name text,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id text,
  target_label text,
  risk_level text NOT NULL DEFAULT 'medium'
    CHECK (risk_level IN ('low', 'medium', 'high')),
  reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  request_path text,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_actor_created
  ON public.admin_audit_logs(actor_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action_created
  ON public.admin_audit_logs(action, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_target
  ON public.admin_audit_logs(target_type, target_id, created_at DESC);

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON public.admin_audit_logs
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

GRANT ALL ON public.admin_audit_logs TO service_role;

NOTIFY pgrst, 'reload schema';
