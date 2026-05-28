CREATE TABLE IF NOT EXISTS public.admin_role_permission_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_role text NOT NULL
    CHECK (admin_role IN ('대표', '팀장', '일반')),
  permission text NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (admin_role, permission)
);

CREATE TABLE IF NOT EXISTS public.admin_member_permission_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  permission text NOT NULL,
  effect text NOT NULL CHECK (effect IN ('allow', 'deny')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (member_id, permission)
);

CREATE INDEX IF NOT EXISTS idx_admin_member_permission_overrides_member
  ON public.admin_member_permission_overrides(member_id);

ALTER TABLE public.admin_role_permission_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_member_permission_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all" ON public.admin_role_permission_policies;
CREATE POLICY "service_role_all" ON public.admin_role_permission_policies
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "service_role_all" ON public.admin_member_permission_overrides;
CREATE POLICY "service_role_all" ON public.admin_member_permission_overrides
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

GRANT ALL ON public.admin_role_permission_policies TO service_role;
GRANT ALL ON public.admin_member_permission_overrides TO service_role;

WITH permissions(permission) AS (
  VALUES
    ('dashboard:read'),
    ('meal:read'),
    ('meal:write'),
    ('meal:import'),
    ('meal:export'),
    ('points:read'),
    ('points:write'),
    ('points:review'),
    ('organization:read'),
    ('organization:write'),
    ('members:read'),
    ('members:write'),
    ('members:sensitive:read'),
    ('members:sensitive:write'),
    ('rbac:manage'),
    ('export:bulk'),
    ('evaluation:read'),
    ('evaluation:write'),
    ('evaluation:deploy'),
    ('attendance:read'),
    ('attendance:write'),
    ('leave:read'),
    ('leave:write'),
    ('leave:approve'),
    ('notifications:read'),
    ('notifications:send'),
    ('finance:read'),
    ('finance:write'),
    ('finance:approve'),
    ('finance:report'),
    ('audit:read'),
    ('settings:read'),
    ('settings:write')
),
roles(admin_role) AS (
  VALUES ('대표'), ('팀장'), ('일반')
)
INSERT INTO public.admin_role_permission_policies (admin_role, permission, enabled)
SELECT
  roles.admin_role,
  permissions.permission,
  CASE
    WHEN roles.admin_role = '대표' THEN true
    WHEN roles.admin_role = '팀장' THEN permissions.permission <> 'rbac:manage'
    WHEN roles.admin_role = '일반' THEN permissions.permission IN (
      'dashboard:read',
      'meal:read',
      'meal:write',
      'meal:import',
      'meal:export',
      'points:read',
      'points:review',
      'organization:read',
      'members:read',
      'evaluation:read',
      'attendance:read',
      'attendance:write',
      'leave:read',
      'leave:write',
      'notifications:read',
      'finance:read',
      'finance:write',
      'settings:read'
    )
    ELSE false
  END
FROM roles
CROSS JOIN permissions
ON CONFLICT (admin_role, permission) DO NOTHING;

NOTIFY pgrst, 'reload schema';
