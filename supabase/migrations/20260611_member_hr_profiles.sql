-- 직원 민감 인사정보 암호문 격리 테이블
CREATE TABLE IF NOT EXISTS public.member_hr_profiles (
  member_id             uuid PRIMARY KEY REFERENCES public.members(id) ON DELETE CASCADE,
  resident_id_enc       text,
  account_enc           text,
  salary_enc            text,
  salary_effective_date date,
  salary_note           text,
  updated_by            uuid REFERENCES public.members(id) ON DELETE SET NULL,
  updated_at            timestamptz NOT NULL DEFAULT now(),
  created_at            timestamptz NOT NULL DEFAULT now()
);

-- RLS 활성화: 정책을 만들지 않음 = 일반 롤 기본 거부. service_role만 우회 접근.
ALTER TABLE public.member_hr_profiles ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
