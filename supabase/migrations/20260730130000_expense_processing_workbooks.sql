CREATE TABLE public.expense_processing_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_filename text NOT NULL,
  storage_path text NOT NULL UNIQUE,
  sheet_name text NOT NULL,
  header_row integer NOT NULL CHECK (header_row > 0),
  row_count integer NOT NULL CHECK (row_count BETWEEN 1 AND 5000),
  uploaded_by uuid NOT NULL REFERENCES public.members(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.expense_processing_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL
    REFERENCES public.expense_processing_batches(id) ON DELETE CASCADE,
  source_row integer NOT NULL CHECK (source_row > 0),
  approval_date text NOT NULL DEFAULT '',
  user_name text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT '' CHECK (char_length(category) <= 2000),
  detail1 text NOT NULL DEFAULT '' CHECK (char_length(detail1) <= 2000),
  detail2 text NOT NULL DEFAULT '' CHECK (char_length(detail2) <= 2000),
  category_cell text NOT NULL
    CHECK (category_cell ~ '^[A-Z]{1,3}[1-9][0-9]*$'),
  detail1_cell text NOT NULL
    CHECK (detail1_cell ~ '^[A-Z]{1,3}[1-9][0-9]*$'),
  detail2_cell text NOT NULL
    CHECK (detail2_cell ~ '^[A-Z]{1,3}[1-9][0-9]*$'),
  UNIQUE (batch_id, source_row)
);

CREATE INDEX expense_processing_batches_created_idx
  ON public.expense_processing_batches(created_at DESC, id DESC);
CREATE INDEX expense_processing_rows_batch_idx
  ON public.expense_processing_rows(batch_id, source_row);

CREATE TRIGGER set_expense_processing_batches_updated_at
  BEFORE UPDATE ON public.expense_processing_batches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.expense_processing_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_processing_rows ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_role_all ON public.expense_processing_batches
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY service_role_all ON public.expense_processing_rows
  FOR ALL TO service_role USING (true) WITH CHECK (true);

REVOKE ALL ON public.expense_processing_batches FROM anon, authenticated;
REVOKE ALL ON public.expense_processing_rows FROM anon, authenticated;
GRANT ALL ON public.expense_processing_batches TO service_role;
GRANT ALL ON public.expense_processing_rows TO service_role;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'expense-processing-workbooks',
  'expense-processing-workbooks',
  false,
  10485760,
  ARRAY[
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY service_role_expense_processing_workbooks ON storage.objects
  FOR ALL TO service_role
  USING (bucket_id = 'expense-processing-workbooks')
  WITH CHECK (bucket_id = 'expense-processing-workbooks');

CREATE OR REPLACE FUNCTION public.create_expense_processing_batch(
  p_batch jsonb,
  p_rows jsonb,
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
  v_batch public.expense_processing_batches%ROWTYPE;
  v_row_count integer;
BEGIN
  IF p_actor_id IS NULL THEN
    RAISE EXCEPTION 'ADMIN_ACTOR_REQUIRED' USING ERRCODE = '22023';
  END IF;
  IF jsonb_typeof(p_rows) <> 'array' THEN
    RAISE EXCEPTION 'EXPENSE_PROCESSING_ROWS_INVALID' USING ERRCODE = '22023';
  END IF;

  v_row_count := jsonb_array_length(p_rows);
  IF v_row_count NOT BETWEEN 1 AND 5000 THEN
    RAISE EXCEPTION 'EXPENSE_PROCESSING_ROW_COUNT_INVALID'
      USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.expense_processing_batches (
    original_filename,
    storage_path,
    sheet_name,
    header_row,
    row_count,
    uploaded_by
  )
  VALUES (
    p_batch ->> 'original_filename',
    p_batch ->> 'storage_path',
    p_batch ->> 'sheet_name',
    (p_batch ->> 'header_row')::integer,
    v_row_count,
    p_actor_id
  )
  RETURNING * INTO v_batch;

  INSERT INTO public.expense_processing_rows (
    batch_id,
    source_row,
    approval_date,
    user_name,
    category,
    detail1,
    detail2,
    category_cell,
    detail1_cell,
    detail2_cell
  )
  SELECT
    v_batch.id,
    (row_data ->> 'row_number')::integer,
    COALESCE(row_data ->> 'approval_date', ''),
    COALESCE(row_data ->> 'user_name', ''),
    COALESCE(row_data ->> 'category', ''),
    COALESCE(row_data ->> 'detail1', ''),
    COALESCE(row_data ->> 'detail2', ''),
    row_data ->> 'category_cell',
    row_data ->> 'detail1_cell',
    row_data ->> 'detail2_cell'
  FROM jsonb_array_elements(p_rows) AS row_data;

  INSERT INTO public.admin_audit_logs (
    actor_id,
    actor_name,
    action,
    target_type,
    target_id,
    target_label,
    risk_level,
    metadata,
    request_path,
    ip_address,
    user_agent
  )
  VALUES (
    p_actor_id,
    (SELECT full_name FROM public.members WHERE id = p_actor_id),
    'expense_processing.upload',
    'expense_processing_batch',
    v_batch.id::text,
    v_batch.original_filename,
    'medium',
    jsonb_build_object('row_count', v_row_count),
    p_request_path,
    p_ip_address,
    p_user_agent
  );

  RETURN jsonb_build_object('batch', to_jsonb(v_batch));
END;
$$;

CREATE OR REPLACE FUNCTION public.update_expense_processing_rows(
  p_batch_id uuid,
  p_rows jsonb,
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
  v_batch public.expense_processing_batches%ROWTYPE;
  v_row record;
  v_row_count integer;
BEGIN
  IF p_actor_id IS NULL THEN
    RAISE EXCEPTION 'ADMIN_ACTOR_REQUIRED' USING ERRCODE = '22023';
  END IF;
  IF jsonb_typeof(p_rows) <> 'array' THEN
    RAISE EXCEPTION 'EXPENSE_PROCESSING_ROWS_INVALID' USING ERRCODE = '22023';
  END IF;

  v_row_count := jsonb_array_length(p_rows);
  IF v_row_count NOT BETWEEN 1 AND 5000 THEN
    RAISE EXCEPTION 'EXPENSE_PROCESSING_ROW_COUNT_INVALID'
      USING ERRCODE = '22023';
  END IF;
  IF (
    SELECT count(DISTINCT row_data ->> 'id')
    FROM jsonb_array_elements(p_rows) AS row_data
  ) <> v_row_count THEN
    RAISE EXCEPTION 'EXPENSE_PROCESSING_ROW_IDS_INVALID'
      USING ERRCODE = '22023';
  END IF;

  SELECT *
  INTO v_batch
  FROM public.expense_processing_batches
  WHERE id = p_batch_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'EXPENSE_PROCESSING_BATCH_NOT_FOUND'
      USING ERRCODE = 'P0002';
  END IF;

  FOR v_row IN
    SELECT *
    FROM jsonb_to_recordset(p_rows) AS input_row(
      id uuid,
      category text,
      detail1 text,
      detail2 text
    )
  LOOP
    IF v_row.category IS NULL OR v_row.detail1 IS NULL OR v_row.detail2 IS NULL
      OR char_length(v_row.category) > 2000
      OR char_length(v_row.detail1) > 2000
      OR char_length(v_row.detail2) > 2000
    THEN
      RAISE EXCEPTION 'EXPENSE_PROCESSING_ROW_VALUES_INVALID'
        USING ERRCODE = '22023';
    END IF;

    UPDATE public.expense_processing_rows
    SET category = v_row.category,
        detail1 = v_row.detail1,
        detail2 = v_row.detail2
    WHERE id = v_row.id
      AND batch_id = p_batch_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'EXPENSE_PROCESSING_ROW_NOT_FOUND'
        USING ERRCODE = 'P0002';
    END IF;
  END LOOP;

  UPDATE public.expense_processing_batches
  SET updated_at = now()
  WHERE id = p_batch_id
  RETURNING * INTO v_batch;

  INSERT INTO public.admin_audit_logs (
    actor_id,
    actor_name,
    action,
    target_type,
    target_id,
    target_label,
    risk_level,
    metadata,
    request_path,
    ip_address,
    user_agent
  )
  VALUES (
    p_actor_id,
    (SELECT full_name FROM public.members WHERE id = p_actor_id),
    'expense_processing.save',
    'expense_processing_batch',
    v_batch.id::text,
    v_batch.original_filename,
    'medium',
    jsonb_build_object('row_count', v_row_count),
    p_request_path,
    p_ip_address,
    p_user_agent
  );

  RETURN jsonb_build_object('updated_at', v_batch.updated_at);
END;
$$;

REVOKE ALL ON FUNCTION public.create_expense_processing_batch(
  jsonb, jsonb, uuid, text, text, text
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_expense_processing_rows(
  uuid, jsonb, uuid, text, text, text
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_expense_processing_batch(
  jsonb, jsonb, uuid, text, text, text
) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_expense_processing_rows(
  uuid, jsonb, uuid, text, text, text
) TO service_role;

WITH permissions(permission) AS (
  VALUES ('expense_processing:read'), ('expense_processing:write')
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
