CREATE OR REPLACE FUNCTION public.mutate_company_document_file(
  p_operation text,
  p_payload jsonb,
  p_actor_id uuid,
  p_request_path text DEFAULT NULL,
  p_ip_address text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_document public.company_documents%ROWTYPE;
  v_old_storage_path text;
  v_now timestamptz := now();
BEGIN
  IF p_actor_id IS NULL THEN
    RAISE EXCEPTION 'ADMIN_ACTOR_REQUIRED' USING ERRCODE = '22023';
  END IF;

  IF p_operation IN ('upload', 'publish_upload') THEN
    INSERT INTO public.company_documents (
      submitted_by,
      title,
      category,
      description,
      note,
      file_name,
      storage_path,
      content_type,
      size_bytes,
      status,
      reviewed_by,
      reviewed_at,
      published_at
    )
    VALUES (
      (p_payload ->> 'submitted_by')::uuid,
      p_payload ->> 'title',
      p_payload ->> 'category',
      NULLIF(p_payload ->> 'description', ''),
      NULLIF(p_payload ->> 'note', ''),
      p_payload ->> 'file_name',
      p_payload ->> 'storage_path',
      p_payload ->> 'content_type',
      (p_payload ->> 'size_bytes')::bigint,
      CASE WHEN p_operation = 'publish_upload' THEN 'published' ELSE 'pending' END,
      CASE WHEN p_operation = 'publish_upload' THEN p_actor_id ELSE NULL END,
      CASE WHEN p_operation = 'publish_upload' THEN v_now ELSE NULL END,
      CASE WHEN p_operation = 'publish_upload' THEN v_now ELSE NULL END
    )
    RETURNING * INTO v_document;
  ELSIF p_operation = 'replace' THEN
    SELECT storage_path
    INTO v_old_storage_path
    FROM public.company_documents
    WHERE id = (p_payload ->> 'id')::uuid
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'COMPANY_DOCUMENT_NOT_FOUND' USING ERRCODE = 'P0002';
    END IF;

    UPDATE public.company_documents
    SET file_name = p_payload ->> 'file_name',
        storage_path = p_payload ->> 'storage_path',
        content_type = p_payload ->> 'content_type',
        size_bytes = (p_payload ->> 'size_bytes')::bigint
    WHERE id = (p_payload ->> 'id')::uuid
    RETURNING * INTO v_document;
  ELSE
    RAISE EXCEPTION 'COMPANY_DOCUMENT_FILE_OPERATION_INVALID'
      USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.admin_audit_logs (
    actor_id,
    actor_name,
    action,
    target_type,
    target_id,
    target_label,
    risk_level,
    request_path,
    ip_address,
    user_agent
  )
  VALUES (
    p_actor_id,
    (SELECT full_name FROM public.members WHERE id = p_actor_id),
    'company_documents.' || p_operation,
    'company_document',
    v_document.id::text,
    v_document.title,
    'medium',
    p_request_path,
    p_ip_address,
    p_user_agent
  );

  RETURN jsonb_build_object(
    'document', to_jsonb(v_document),
    'oldStoragePath', v_old_storage_path
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.guard_offboarding_checklist_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_request_id uuid;
  v_status text;
BEGIN
  v_request_id := CASE
    WHEN TG_OP = 'DELETE' THEN OLD.offboarding_request_id
    ELSE NEW.offboarding_request_id
  END;

  SELECT status
  INTO v_status
  FROM public.offboarding_requests
  WHERE id = v_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'OFFBOARDING_REQUEST_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;
  IF v_status NOT IN ('pending', 'approved') THEN
    RAISE EXCEPTION 'OFFBOARDING_CHECKLIST_LOCKED' USING ERRCODE = '22023';
  END IF;

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_offboarding_request(p_request_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
BEGIN
  SELECT status
  INTO v_status
  FROM public.offboarding_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'OFFBOARDING_REQUEST_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;
  IF v_status <> 'approved' THEN
    RAISE EXCEPTION 'OFFBOARDING_REQUEST_NOT_APPROVED' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM public.offboarding_checklist_items
    WHERE offboarding_request_id = p_request_id
      AND is_completed = false
  ) THEN
    RAISE EXCEPTION 'OFFBOARDING_CHECKLIST_INCOMPLETE' USING ERRCODE = '22023';
  END IF;

  UPDATE public.offboarding_requests
  SET status = 'completed',
      completed_at = now()
  WHERE id = p_request_id;

  RETURN p_request_id;
END;
$$;

DROP TRIGGER IF EXISTS guard_offboarding_checklist_mutation
  ON public.offboarding_checklist_items;
CREATE TRIGGER guard_offboarding_checklist_mutation
  BEFORE INSERT OR UPDATE OR DELETE ON public.offboarding_checklist_items
  FOR EACH ROW EXECUTE FUNCTION public.guard_offboarding_checklist_mutation();

CREATE INDEX IF NOT EXISTS offboarding_requests_created_idx
  ON public.offboarding_requests(created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS seat_requests_created_idx
  ON public.seat_requests(created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS seat_assignments_created_idx
  ON public.seat_assignments(created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS parking_registrations_created_idx
  ON public.parking_registrations(created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS corporate_card_transactions_usage_idx
  ON public.corporate_card_transactions(usage_date DESC, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS corporate_card_transactions_member_usage_idx
  ON public.corporate_card_transactions(
    member_id,
    usage_date DESC,
    created_at DESC,
    id DESC
  );
CREATE INDEX IF NOT EXISTS company_documents_created_idx
  ON public.company_documents(created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS company_documents_published_idx
  ON public.company_documents(published_at DESC, created_at DESC, id DESC)
  WHERE status = 'published';

REVOKE ALL ON FUNCTION public.mutate_company_document_file(
  text, jsonb, uuid, text, text, text
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.complete_offboarding_request(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mutate_company_document_file(
  text, jsonb, uuid, text, text, text
) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_offboarding_request(uuid)
  TO service_role;

NOTIFY pgrst, 'reload schema';
