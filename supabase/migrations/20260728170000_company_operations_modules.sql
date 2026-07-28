-- Manual company operations modules: offboarding, seating, parking,
-- corporate cards, and company documents.

CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA public;

CREATE TABLE public.offboarding_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE RESTRICT,
  requested_final_working_date date NOT NULL,
  confirmed_final_working_date date,
  reason text NOT NULL CHECK (length(btrim(reason)) BETWEEN 1 AND 1000),
  note text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'completed', 'cancelled')),
  rejection_reason text,
  admin_note text,
  processed_by uuid REFERENCES public.members(id) ON DELETE SET NULL,
  processed_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX offboarding_requests_one_open_per_member
  ON public.offboarding_requests(member_id)
  WHERE status IN ('pending', 'approved');
CREATE INDEX offboarding_requests_member_created_idx
  ON public.offboarding_requests(member_id, created_at DESC);
CREATE INDEX offboarding_requests_status_date_idx
  ON public.offboarding_requests(status, requested_final_working_date);

CREATE TABLE public.offboarding_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offboarding_request_id uuid NOT NULL
    REFERENCES public.offboarding_requests(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 200),
  responsible_party text,
  is_completed boolean NOT NULL DEFAULT false,
  completion_note text,
  completed_at timestamptz,
  sort_order integer NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (is_completed AND completed_at IS NOT NULL)
    OR (NOT is_completed AND completed_at IS NULL)
  )
);

CREATE INDEX offboarding_checklist_request_idx
  ON public.offboarding_checklist_items(offboarding_request_id, sort_order, created_at);

CREATE TABLE public.office_seats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE CHECK (length(btrim(code)) BETWEEN 1 AND 40),
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 100),
  zone text NOT NULL CHECK (length(btrim(zone)) BETWEEN 1 AND 100),
  floor text,
  row_label text,
  column_label text,
  status text NOT NULL DEFAULT 'available'
    CHECK (status IN ('available', 'disabled')),
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX office_seats_location_idx
  ON public.office_seats(zone, floor, row_label, column_label, code);

CREATE TABLE public.seat_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE RESTRICT,
  requested_seat_id uuid REFERENCES public.office_seats(id) ON DELETE SET NULL,
  assigned_seat_id uuid REFERENCES public.office_seats(id) ON DELETE RESTRICT,
  requested_start_date date NOT NULL DEFAULT CURRENT_DATE,
  requested_end_date date,
  note text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  rejection_reason text,
  processed_by uuid REFERENCES public.members(id) ON DELETE SET NULL,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (requested_end_date IS NULL OR requested_end_date >= requested_start_date)
);

CREATE UNIQUE INDEX seat_requests_one_pending_per_member
  ON public.seat_requests(member_id)
  WHERE status = 'pending';
CREATE INDEX seat_requests_member_created_idx
  ON public.seat_requests(member_id, created_at DESC);
CREATE INDEX seat_requests_status_created_idx
  ON public.seat_requests(status, created_at DESC);

CREATE TABLE public.seat_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seat_id uuid NOT NULL REFERENCES public.office_seats(id) ON DELETE RESTRICT,
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE RESTRICT,
  request_id uuid REFERENCES public.seat_requests(id) ON DELETE SET NULL,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  is_primary boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'ended', 'cancelled')),
  note text,
  assigned_by uuid REFERENCES public.members(id) ON DELETE SET NULL,
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_date IS NULL OR end_date >= start_date)
);

ALTER TABLE public.seat_assignments
  ADD CONSTRAINT seat_assignments_no_seat_overlap
  EXCLUDE USING gist (
    seat_id WITH =,
    daterange(start_date, COALESCE(end_date, 'infinity'::date), '[]') WITH &&
  ) WHERE (status = 'active');

ALTER TABLE public.seat_assignments
  ADD CONSTRAINT seat_assignments_no_primary_member_overlap
  EXCLUDE USING gist (
    member_id WITH =,
    daterange(start_date, COALESCE(end_date, 'infinity'::date), '[]') WITH &&
  ) WHERE (status = 'active' AND is_primary);

CREATE INDEX seat_assignments_member_status_idx
  ON public.seat_assignments(member_id, status, start_date DESC);
CREATE INDEX seat_assignments_seat_status_idx
  ON public.seat_assignments(seat_id, status, start_date DESC);

CREATE TABLE public.parking_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE RESTRICT,
  vehicle_plate text NOT NULL CHECK (length(btrim(vehicle_plate)) BETWEEN 2 AND 30),
  plate_normalized text GENERATED ALWAYS AS (
    upper(regexp_replace(vehicle_plate, '[^0-9A-Za-z가-힣]', '', 'g'))
  ) STORED,
  vehicle_name text NOT NULL CHECK (length(btrim(vehicle_name)) BETWEEN 1 AND 100),
  vehicle_type text NOT NULL CHECK (length(btrim(vehicle_type)) BETWEEN 1 AND 50),
  requested_start_date date NOT NULL,
  requested_end_date date,
  note text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'expired', 'cancelled', 'archived')),
  rejection_reason text,
  admin_note text,
  processed_by uuid REFERENCES public.members(id) ON DELETE SET NULL,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (requested_end_date IS NULL OR requested_end_date >= requested_start_date),
  CHECK (length(plate_normalized) BETWEEN 2 AND 20)
);

ALTER TABLE public.parking_registrations
  ADD CONSTRAINT parking_registrations_no_plate_overlap
  EXCLUDE USING gist (
    plate_normalized WITH =,
    daterange(
      requested_start_date,
      COALESCE(requested_end_date, 'infinity'::date),
      '[]'
    ) WITH &&
  ) WHERE (status = 'approved');

CREATE UNIQUE INDEX parking_registrations_one_pending_plate
  ON public.parking_registrations(member_id, plate_normalized)
  WHERE status = 'pending';
CREATE INDEX parking_registrations_member_created_idx
  ON public.parking_registrations(member_id, created_at DESC);
CREATE INDEX parking_registrations_status_date_idx
  ON public.parking_registrations(status, requested_start_date);

CREATE TABLE public.corporate_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 100),
  issuer text NOT NULL CHECK (length(btrim(issuer)) BETWEEN 1 AND 100),
  last_four text NOT NULL CHECK (last_four ~ '^[0-9]{4}$'),
  assigned_member_id uuid REFERENCES public.members(id) ON DELETE SET NULL,
  assigned_team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'disabled', 'archived')),
  monthly_limit numeric(14, 2) CHECK (monthly_limit IS NULL OR monthly_limit >= 0),
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX corporate_cards_assignment_idx
  ON public.corporate_cards(assigned_member_id, assigned_team_id, status);

CREATE TABLE public.corporate_card_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid NOT NULL REFERENCES public.corporate_cards(id) ON DELETE RESTRICT,
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE RESTRICT,
  usage_date date NOT NULL,
  merchant text NOT NULL CHECK (length(btrim(merchant)) BETWEEN 1 AND 200),
  amount numeric(14, 2) NOT NULL CHECK (amount > 0),
  category text NOT NULL CHECK (length(btrim(category)) BETWEEN 1 AND 100),
  business_purpose text NOT NULL
    CHECK (length(btrim(business_purpose)) BETWEEN 1 AND 1000),
  note text,
  receipt_storage_path text,
  receipt_file_name text,
  receipt_content_type text,
  receipt_size_bytes bigint CHECK (receipt_size_bytes IS NULL OR receipt_size_bytes > 0),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled', 'archived')),
  rejection_reason text,
  reviewed_by uuid REFERENCES public.members(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (receipt_storage_path IS NULL AND receipt_file_name IS NULL
      AND receipt_content_type IS NULL AND receipt_size_bytes IS NULL)
    OR
    (receipt_storage_path IS NOT NULL AND receipt_file_name IS NOT NULL
      AND receipt_content_type IS NOT NULL AND receipt_size_bytes IS NOT NULL)
  )
);

CREATE INDEX corporate_card_transactions_member_created_idx
  ON public.corporate_card_transactions(member_id, created_at DESC);
CREATE INDEX corporate_card_transactions_status_date_idx
  ON public.corporate_card_transactions(status, usage_date DESC);
CREATE INDEX corporate_card_transactions_card_date_idx
  ON public.corporate_card_transactions(card_id, usage_date DESC);

CREATE TABLE public.company_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submitted_by uuid NOT NULL REFERENCES public.members(id) ON DELETE RESTRICT,
  title text NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 200),
  category text NOT NULL
    CHECK (category IN ('policy', 'hr', 'finance', 'operations', 'forms', 'other')),
  description text,
  note text,
  file_name text NOT NULL,
  storage_path text NOT NULL UNIQUE,
  content_type text NOT NULL,
  size_bytes bigint NOT NULL CHECK (size_bytes > 0),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'published', 'rejected', 'cancelled', 'archived')),
  rejection_reason text,
  reviewed_by uuid REFERENCES public.members(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX company_documents_status_category_idx
  ON public.company_documents(status, category, published_at DESC, created_at DESC);
CREATE INDEX company_documents_submitter_created_idx
  ON public.company_documents(submitted_by, created_at DESC);

CREATE OR REPLACE FUNCTION public.guard_offboarding_request_transition()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;
  IF (OLD.status = 'pending' AND NEW.status IN ('approved', 'rejected', 'cancelled'))
    OR (OLD.status = 'approved' AND NEW.status IN ('completed', 'cancelled')) THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'OFFBOARDING_INVALID_TRANSITION'
    USING ERRCODE = '22023';
END;
$$;

CREATE OR REPLACE FUNCTION public.guard_seat_request_transition()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;
  IF OLD.status = 'pending'
    AND NEW.status IN ('approved', 'rejected', 'cancelled') THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'SEAT_REQUEST_INVALID_TRANSITION'
    USING ERRCODE = '22023';
END;
$$;

CREATE OR REPLACE FUNCTION public.guard_seat_assignment_transition()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;
  IF OLD.status = 'active' AND NEW.status IN ('ended', 'cancelled') THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'SEAT_ASSIGNMENT_INVALID_TRANSITION'
    USING ERRCODE = '22023';
END;
$$;

CREATE OR REPLACE FUNCTION public.guard_parking_registration_transition()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;
  IF (OLD.status = 'pending' AND NEW.status IN ('approved', 'rejected', 'cancelled'))
    OR (OLD.status = 'approved' AND NEW.status IN ('expired', 'cancelled', 'archived'))
    OR (OLD.status IN ('rejected', 'expired', 'cancelled') AND NEW.status = 'archived') THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'PARKING_INVALID_TRANSITION'
    USING ERRCODE = '22023';
END;
$$;

CREATE OR REPLACE FUNCTION public.guard_corporate_card_transaction_transition()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;
  IF (OLD.status = 'pending' AND NEW.status IN ('approved', 'rejected', 'cancelled'))
    OR (OLD.status IN ('approved', 'rejected', 'cancelled') AND NEW.status = 'archived') THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'CORPORATE_CARD_TRANSACTION_INVALID_TRANSITION'
    USING ERRCODE = '22023';
END;
$$;

CREATE OR REPLACE FUNCTION public.guard_company_document_transition()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;
  IF (OLD.status = 'pending' AND NEW.status IN ('published', 'rejected', 'cancelled'))
    OR (OLD.status = 'published' AND NEW.status = 'archived')
    OR (OLD.status = 'rejected' AND NEW.status IN ('pending', 'published', 'archived'))
    OR (OLD.status = 'cancelled' AND NEW.status = 'archived') THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'COMPANY_DOCUMENT_INVALID_TRANSITION'
    USING ERRCODE = '22023';
END;
$$;

CREATE OR REPLACE FUNCTION public.assert_safe_corporate_card_payload(p_payload jsonb)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  sensitive_keys text[] := ARRAY[
    'cardNumber', 'card_number', 'fullNumber', 'full_number', 'pan',
    'pin', 'cvc', 'cvv', 'magneticData', 'magnetic_data'
  ];
BEGIN
  IF p_payload ?| sensitive_keys THEN
    RAISE EXCEPTION 'CORPORATE_CARD_SENSITIVE_DATA_FORBIDDEN'
      USING ERRCODE = '22023';
  END IF;

  IF p_payload ? 'lastFour'
    AND COALESCE(p_payload ->> 'lastFour', '') !~ '^[0-9]{4}$' THEN
    RAISE EXCEPTION 'CORPORATE_CARD_LAST_FOUR_INVALID'
      USING ERRCODE = '22023';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.resolve_seat_request(
  p_request_id uuid,
  p_actor_id uuid,
  p_action text,
  p_seat_id uuid DEFAULT NULL,
  p_rejection_reason text DEFAULT NULL,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request public.seat_requests%ROWTYPE;
  v_assignment_id uuid;
  v_start_date date;
  v_end_date date;
BEGIN
  SELECT * INTO v_request
  FROM public.seat_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SEAT_REQUEST_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;
  IF v_request.status <> 'pending' THEN
    RAISE EXCEPTION 'SEAT_REQUEST_ALREADY_PROCESSED' USING ERRCODE = '22023';
  END IF;

  IF p_action = 'reject' THEN
    IF NULLIF(btrim(COALESCE(p_rejection_reason, '')), '') IS NULL THEN
      RAISE EXCEPTION 'SEAT_REJECTION_REASON_REQUIRED' USING ERRCODE = '22023';
    END IF;
    UPDATE public.seat_requests
    SET status = 'rejected',
        rejection_reason = btrim(p_rejection_reason),
        processed_by = p_actor_id,
        processed_at = now()
    WHERE id = p_request_id;
    RETURN NULL;
  END IF;

  IF p_action <> 'approve' OR p_seat_id IS NULL THEN
    RAISE EXCEPTION 'SEAT_REQUEST_ACTION_INVALID' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.office_seats
    WHERE id = p_seat_id AND status = 'available'
  ) THEN
    RAISE EXCEPTION 'SEAT_NOT_AVAILABLE' USING ERRCODE = '22023';
  END IF;

  v_start_date := COALESCE(p_start_date, v_request.requested_start_date);
  v_end_date := COALESCE(p_end_date, v_request.requested_end_date);
  IF v_end_date IS NOT NULL AND v_end_date < v_start_date THEN
    RAISE EXCEPTION 'SEAT_DATE_RANGE_INVALID' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.seat_assignments (
    seat_id, member_id, request_id, start_date, end_date, assigned_by
  )
  VALUES (
    p_seat_id, v_request.member_id, v_request.id,
    v_start_date, v_end_date, p_actor_id
  )
  RETURNING id INTO v_assignment_id;

  UPDATE public.seat_requests
  SET status = 'approved',
      assigned_seat_id = p_seat_id,
      processed_by = p_actor_id,
      processed_at = now()
  WHERE id = p_request_id;

  RETURN v_assignment_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.move_seat_assignment(
  p_assignment_id uuid,
  p_new_seat_id uuid,
  p_actor_id uuid,
  p_start_date date DEFAULT CURRENT_DATE,
  p_end_date date DEFAULT NULL,
  p_note text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_assignment public.seat_assignments%ROWTYPE;
  v_new_id uuid;
BEGIN
  SELECT * INTO v_assignment
  FROM public.seat_assignments
  WHERE id = p_assignment_id
  FOR UPDATE;

  IF NOT FOUND OR v_assignment.status <> 'active' THEN
    RAISE EXCEPTION 'SEAT_ASSIGNMENT_NOT_ACTIVE' USING ERRCODE = '22023';
  END IF;
  IF p_start_date < v_assignment.start_date THEN
    RAISE EXCEPTION 'SEAT_DATE_RANGE_INVALID' USING ERRCODE = '22023';
  END IF;
  IF p_end_date IS NOT NULL AND p_end_date < p_start_date THEN
    RAISE EXCEPTION 'SEAT_DATE_RANGE_INVALID' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.office_seats
    WHERE id = p_new_seat_id AND status = 'available'
  ) THEN
    RAISE EXCEPTION 'SEAT_NOT_AVAILABLE' USING ERRCODE = '22023';
  END IF;

  UPDATE public.seat_assignments
  SET status = 'ended',
      end_date = GREATEST(
        start_date,
        LEAST(COALESCE(end_date, p_start_date - 1), p_start_date - 1)
      ),
      ended_at = now()
  WHERE id = p_assignment_id;

  INSERT INTO public.seat_assignments (
    seat_id, member_id, start_date, end_date, is_primary, status,
    note, assigned_by
  )
  VALUES (
    p_new_seat_id, v_assignment.member_id, p_start_date, p_end_date,
    v_assignment.is_primary, 'active', p_note, p_actor_id
  )
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$;

DROP TRIGGER IF EXISTS guard_offboarding_request_transition
  ON public.offboarding_requests;
CREATE TRIGGER guard_offboarding_request_transition
  BEFORE UPDATE OF status ON public.offboarding_requests
  FOR EACH ROW EXECUTE FUNCTION public.guard_offboarding_request_transition();

DROP TRIGGER IF EXISTS guard_seat_request_transition ON public.seat_requests;
CREATE TRIGGER guard_seat_request_transition
  BEFORE UPDATE OF status ON public.seat_requests
  FOR EACH ROW EXECUTE FUNCTION public.guard_seat_request_transition();

DROP TRIGGER IF EXISTS guard_seat_assignment_transition ON public.seat_assignments;
CREATE TRIGGER guard_seat_assignment_transition
  BEFORE UPDATE OF status ON public.seat_assignments
  FOR EACH ROW EXECUTE FUNCTION public.guard_seat_assignment_transition();

DROP TRIGGER IF EXISTS guard_parking_registration_transition
  ON public.parking_registrations;
CREATE TRIGGER guard_parking_registration_transition
  BEFORE UPDATE OF status ON public.parking_registrations
  FOR EACH ROW EXECUTE FUNCTION public.guard_parking_registration_transition();

DROP TRIGGER IF EXISTS guard_corporate_card_transaction_transition
  ON public.corporate_card_transactions;
CREATE TRIGGER guard_corporate_card_transaction_transition
  BEFORE UPDATE OF status ON public.corporate_card_transactions
  FOR EACH ROW EXECUTE FUNCTION public.guard_corporate_card_transaction_transition();

DROP TRIGGER IF EXISTS guard_company_document_transition ON public.company_documents;
CREATE TRIGGER guard_company_document_transition
  BEFORE UPDATE OF status ON public.company_documents
  FOR EACH ROW EXECUTE FUNCTION public.guard_company_document_transition();

CREATE TRIGGER set_offboarding_requests_updated_at
  BEFORE UPDATE ON public.offboarding_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_offboarding_checklist_items_updated_at
  BEFORE UPDATE ON public.offboarding_checklist_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_office_seats_updated_at
  BEFORE UPDATE ON public.office_seats
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_seat_requests_updated_at
  BEFORE UPDATE ON public.seat_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_seat_assignments_updated_at
  BEFORE UPDATE ON public.seat_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_parking_registrations_updated_at
  BEFORE UPDATE ON public.parking_registrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_corporate_cards_updated_at
  BEFORE UPDATE ON public.corporate_cards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_corporate_card_transactions_updated_at
  BEFORE UPDATE ON public.corporate_card_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_company_documents_updated_at
  BEFORE UPDATE ON public.company_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.offboarding_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offboarding_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.office_seats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seat_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seat_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parking_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corporate_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corporate_card_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_role_all ON public.offboarding_requests
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY service_role_all ON public.offboarding_checklist_items
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY service_role_all ON public.office_seats
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY service_role_all ON public.seat_requests
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY service_role_all ON public.seat_assignments
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY service_role_all ON public.parking_registrations
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY service_role_all ON public.corporate_cards
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY service_role_all ON public.corporate_card_transactions
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY service_role_all ON public.company_documents
  FOR ALL TO service_role USING (true) WITH CHECK (true);

REVOKE ALL ON public.offboarding_requests FROM anon, authenticated;
REVOKE ALL ON public.offboarding_checklist_items FROM anon, authenticated;
REVOKE ALL ON public.office_seats FROM anon, authenticated;
REVOKE ALL ON public.seat_requests FROM anon, authenticated;
REVOKE ALL ON public.seat_assignments FROM anon, authenticated;
REVOKE ALL ON public.parking_registrations FROM anon, authenticated;
REVOKE ALL ON public.corporate_cards FROM anon, authenticated;
REVOKE ALL ON public.corporate_card_transactions FROM anon, authenticated;
REVOKE ALL ON public.company_documents FROM anon, authenticated;

GRANT ALL ON public.offboarding_requests TO service_role;
GRANT ALL ON public.offboarding_checklist_items TO service_role;
GRANT ALL ON public.office_seats TO service_role;
GRANT ALL ON public.seat_requests TO service_role;
GRANT ALL ON public.seat_assignments TO service_role;
GRANT ALL ON public.parking_registrations TO service_role;
GRANT ALL ON public.corporate_cards TO service_role;
GRANT ALL ON public.corporate_card_transactions TO service_role;
GRANT ALL ON public.company_documents TO service_role;

REVOKE ALL ON FUNCTION public.assert_safe_corporate_card_payload(jsonb)
  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.resolve_seat_request(
  uuid, uuid, text, uuid, text, date, date
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.move_seat_assignment(
  uuid, uuid, uuid, date, date, text
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.assert_safe_corporate_card_payload(jsonb)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.resolve_seat_request(
  uuid, uuid, text, uuid, text, date, date
) TO service_role;
GRANT EXECUTE ON FUNCTION public.move_seat_assignment(
  uuid, uuid, uuid, date, date, text
) TO service_role;

INSERT INTO storage.buckets (id, name, public)
VALUES
  ('corporate-card-receipts', 'corporate-card-receipts', false),
  ('company-documents', 'company-documents', false)
ON CONFLICT (id) DO UPDATE SET public = false;

DROP POLICY IF EXISTS service_role_corporate_card_receipts ON storage.objects;
CREATE POLICY service_role_corporate_card_receipts ON storage.objects
  FOR ALL TO service_role
  USING (bucket_id = 'corporate-card-receipts')
  WITH CHECK (bucket_id = 'corporate-card-receipts');

DROP POLICY IF EXISTS service_role_company_documents ON storage.objects;
CREATE POLICY service_role_company_documents ON storage.objects
  FOR ALL TO service_role
  USING (bucket_id = 'company-documents')
  WITH CHECK (bucket_id = 'company-documents');

WITH permissions(permission) AS (
  VALUES
    ('offboarding:read'), ('offboarding:write'),
    ('seating:read'), ('seating:write'),
    ('parking:read'), ('parking:write'),
    ('corporate_card:read'), ('corporate_card:write'),
    ('company_documents:read'), ('company_documents:write')
),
roles(admin_role) AS (
  VALUES ('대표'), ('팀장'), ('일반')
)
INSERT INTO public.admin_role_permission_policies (
  admin_role, permission, enabled
)
SELECT roles.admin_role, permissions.permission, true
FROM roles
CROSS JOIN permissions
ON CONFLICT (admin_role, permission) DO NOTHING;

NOTIFY pgrst, 'reload schema';
