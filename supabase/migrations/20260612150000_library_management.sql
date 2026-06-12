CREATE TABLE IF NOT EXISTS public.books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  author text,
  memo text,
  status text NOT NULL DEFAULT 'available'
    CHECK (status IN ('available', 'disabled')),
  rental_period_days_override integer
    CHECK (rental_period_days_override IS NULL OR rental_period_days_override > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.books IS '사내 도서관 도서 마스터';
COMMENT ON COLUMN public.books.status IS 'available(대여 가능), disabled(대여중지)';
COMMENT ON COLUMN public.books.rental_period_days_override IS '도서별 대여 기간 override. NULL이면 전역 기본값 사용';

CREATE TABLE IF NOT EXISTS public.library_settings (
  id text PRIMARY KEY DEFAULT 'default',
  default_rental_period_days integer NOT NULL DEFAULT 14
    CHECK (default_rental_period_days > 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.library_settings IS '도서관 전역 설정';

CREATE TABLE IF NOT EXISTS public.book_rentals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  requester_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'return_requested', 'returned')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz,
  rented_at timestamptz,
  due_at timestamptz,
  return_requested_at timestamptz,
  returned_at timestamptz,
  processed_by uuid REFERENCES public.members(id) ON DELETE SET NULL,
  reject_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.book_rentals IS '도서 대여 신청 및 반납 이력';
COMMENT ON COLUMN public.book_rentals.status IS 'pending, approved, rejected, return_requested(P&C 접수중), returned';

CREATE INDEX IF NOT EXISTS idx_books_status_title
  ON public.books (status, title);
CREATE INDEX IF NOT EXISTS idx_book_rentals_book_created
  ON public.book_rentals (book_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_book_rentals_requester_created
  ON public.book_rentals (requester_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_book_rentals_status_created
  ON public.book_rentals (status, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_book_rentals_one_active_per_book
  ON public.book_rentals (book_id)
  WHERE status IN ('approved', 'return_requested') AND returned_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_book_rentals_one_pending_per_requester_book
  ON public.book_rentals (book_id, requester_id)
  WHERE status = 'pending';

INSERT INTO public.library_settings (id, default_rental_period_days)
VALUES ('default', 14)
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE TRIGGER set_books_updated_at
  BEFORE UPDATE ON public.books
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER set_library_settings_updated_at
  BEFORE UPDATE ON public.library_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER set_book_rentals_updated_at
  BEFORE UPDATE ON public.book_rentals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_rentals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all" ON public.books;
CREATE POLICY "service_role_all" ON public.books
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all" ON public.library_settings;
CREATE POLICY "service_role_all" ON public.library_settings
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all" ON public.book_rentals;
CREATE POLICY "service_role_all" ON public.book_rentals
  FOR ALL TO service_role USING (true) WITH CHECK (true);

GRANT ALL ON public.books TO service_role;
GRANT ALL ON public.library_settings TO service_role;
GRANT ALL ON public.book_rentals TO service_role;

INSERT INTO public.admin_role_permission_policies (admin_role, permission, enabled)
VALUES
  ('대표', 'library:read', true),
  ('대표', 'library:write', true),
  ('팀장', 'library:read', true),
  ('팀장', 'library:write', true),
  ('일반', 'library:read', true),
  ('일반', 'library:write', true)
ON CONFLICT (admin_role, permission) DO NOTHING;

NOTIFY pgrst, 'reload schema';
