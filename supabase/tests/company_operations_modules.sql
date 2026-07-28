\set ON_ERROR_STOP on

BEGIN;

DO $$
DECLARE
  v_member_a uuid := gen_random_uuid();
  v_member_b uuid := gen_random_uuid();
  v_admin uuid := gen_random_uuid();
  v_seat_a uuid;
  v_seat_b uuid;
  v_seat_c uuid;
  v_request uuid;
  v_offboarding uuid;
  v_document uuid;
  v_document_path text := 'tests/company-operations/original.pdf';
  v_failed_document_path text := 'tests/company-operations/failed.pdf';
  v_invalid_actor uuid := gen_random_uuid();
  v_expected boolean;
  v_sensitive_columns integer;
  v_permission_count integer;
BEGIN
  INSERT INTO public.members (id, login_id, password, full_name, role)
  VALUES
    (v_member_a, 'ops-a-' || v_member_a, 'test-only', 'Ops Member A', 'user'),
    (v_member_b, 'ops-b-' || v_member_b, 'test-only', 'Ops Member B', 'user'),
    (v_admin, 'ops-admin-' || v_admin, 'test-only', 'Ops Admin', 'admin');

  INSERT INTO public.office_seats (code, name, zone)
  VALUES
    ('OPS-A-' || left(v_member_a::text, 6), 'Seat A', 'Test'),
    ('OPS-B-' || left(v_member_b::text, 6), 'Seat B', 'Test'),
    ('OPS-C-' || left(v_admin::text, 6), 'Seat C', 'Test');

  SELECT id INTO v_seat_a
  FROM public.office_seats
  WHERE code = 'OPS-A-' || left(v_member_a::text, 6);
  SELECT id INTO v_seat_b
  FROM public.office_seats
  WHERE code = 'OPS-B-' || left(v_member_b::text, 6);
  SELECT id INTO v_seat_c
  FROM public.office_seats
  WHERE code = 'OPS-C-' || left(v_admin::text, 6);

  INSERT INTO public.seat_assignments (
    seat_id, member_id, start_date, end_date, assigned_by
  )
  VALUES (v_seat_a, v_member_a, DATE '2099-01-01', DATE '2099-01-10', v_admin);

  v_expected := false;
  BEGIN
    INSERT INTO public.seat_assignments (
      seat_id, member_id, start_date, end_date, assigned_by
    )
    VALUES (v_seat_a, v_member_b, DATE '2099-01-05', DATE '2099-01-15', v_admin);
  EXCEPTION WHEN exclusion_violation THEN
    v_expected := true;
  END;
  IF NOT v_expected THEN
    RAISE EXCEPTION '겹치는 좌석 배정이 차단되지 않음';
  END IF;

  v_expected := false;
  BEGIN
    INSERT INTO public.seat_assignments (
      seat_id, member_id, start_date, end_date, assigned_by
    )
    VALUES (v_seat_b, v_member_a, DATE '2099-01-05', DATE '2099-01-08', v_admin);
  EXCEPTION WHEN exclusion_violation THEN
    v_expected := true;
  END;
  IF NOT v_expected THEN
    RAISE EXCEPTION '한 직원의 겹치는 주 좌석이 차단되지 않음';
  END IF;

  INSERT INTO public.seat_requests (
    member_id, requested_seat_id, requested_start_date, requested_end_date
  )
  VALUES (v_member_b, v_seat_b, DATE '2099-02-01', DATE '2099-02-10')
  RETURNING id INTO v_request;

  PERFORM public.resolve_seat_request(
    v_request, v_admin, 'approve', v_seat_b, NULL,
    DATE '2099-02-01', DATE '2099-02-10'
  );

  v_expected := false;
  BEGIN
    PERFORM public.resolve_seat_request(
      v_request, v_admin, 'approve', v_seat_c, NULL,
      DATE '2099-02-01', DATE '2099-02-10'
    );
  EXCEPTION WHEN invalid_parameter_value THEN
    v_expected := SQLERRM = 'SEAT_REQUEST_ALREADY_PROCESSED';
  END;
  IF NOT v_expected THEN
    RAISE EXCEPTION '좌석 요청 중복 처리가 차단되지 않음';
  END IF;

  INSERT INTO public.parking_registrations (
    member_id, vehicle_plate, vehicle_name, vehicle_type,
    requested_start_date, requested_end_date, status,
    processed_by, processed_at
  )
  VALUES (
    v_member_a, '12가 3456', '차량 A', '승용',
    DATE '2099-03-01', DATE '2099-03-31', 'approved',
    v_admin, now()
  );

  v_expected := false;
  BEGIN
    INSERT INTO public.parking_registrations (
      member_id, vehicle_plate, vehicle_name, vehicle_type,
      requested_start_date, requested_end_date, status,
      processed_by, processed_at
    )
    VALUES (
      v_member_b, '12가-3456', '차량 B', '승용',
      DATE '2099-03-15', DATE '2099-04-01', 'approved',
      v_admin, now()
    );
  EXCEPTION WHEN exclusion_violation THEN
    v_expected := true;
  END;
  IF NOT v_expected THEN
    RAISE EXCEPTION '겹치는 차량번호 승인이 차단되지 않음';
  END IF;

  v_expected := false;
  BEGIN
    PERFORM public.assert_safe_corporate_card_payload(
      '{"name":"테스트","lastFour":"1234","fullNumber":"1234123412341234"}'::jsonb
    );
  EXCEPTION WHEN invalid_parameter_value THEN
    v_expected := SQLERRM = 'CORPORATE_CARD_SENSITIVE_DATA_FORBIDDEN';
  END;
  IF NOT v_expected THEN
    RAISE EXCEPTION '기업카드 민감정보 입력이 차단되지 않음';
  END IF;

  SELECT count(*) INTO v_sensitive_columns
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'corporate_cards'
    AND column_name IN (
      'card_number', 'full_number', 'pan', 'pin', 'cvc', 'cvv',
      'magnetic_data'
    );
  IF v_sensitive_columns <> 0 THEN
    RAISE EXCEPTION '기업카드 테이블에 민감정보 컬럼이 존재함';
  END IF;

  INSERT INTO public.offboarding_requests (
    member_id, requested_final_working_date, reason
  )
  VALUES (v_member_a, DATE '2099-12-31', '테스트')
  RETURNING id INTO v_offboarding;

  UPDATE public.offboarding_requests
  SET status = 'approved'
  WHERE id = v_offboarding;

  v_expected := false;
  BEGIN
    UPDATE public.offboarding_requests
    SET status = 'rejected'
    WHERE id = v_offboarding;
  EXCEPTION WHEN invalid_parameter_value THEN
    v_expected := SQLERRM = 'OFFBOARDING_INVALID_TRANSITION';
  END;
  IF NOT v_expected THEN
    RAISE EXCEPTION '오프보딩 잘못된 상태 전이가 차단되지 않음';
  END IF;

  INSERT INTO public.offboarding_checklist_items (
    offboarding_request_id, title, is_completed, completed_at
  )
  VALUES (v_offboarding, '테스트 체크 항목', true, now());

  PERFORM public.complete_offboarding_request(v_offboarding);

  v_expected := false;
  BEGIN
    UPDATE public.offboarding_checklist_items
    SET is_completed = false,
        completed_at = NULL
    WHERE offboarding_request_id = v_offboarding;
  EXCEPTION WHEN invalid_parameter_value THEN
    v_expected := SQLERRM = 'OFFBOARDING_CHECKLIST_LOCKED';
  END;
  IF NOT v_expected THEN
    RAISE EXCEPTION '완료된 오프보딩 체크리스트 변경이 차단되지 않음';
  END IF;

  INSERT INTO public.company_documents (
    submitted_by, title, category, file_name, storage_path, content_type, size_bytes
  )
  VALUES (
    v_member_a, '원본 자료', 'other', 'original.pdf',
    v_document_path, 'application/pdf', 10
  )
  RETURNING id INTO v_document;

  v_expected := false;
  BEGIN
    PERFORM public.mutate_company_document_file(
      'replace',
      jsonb_build_object(
        'id', v_document,
        'file_name', 'failed.pdf',
        'storage_path', v_failed_document_path,
        'content_type', 'application/pdf',
        'size_bytes', 20
      ),
      v_invalid_actor
    );
  EXCEPTION WHEN foreign_key_violation THEN
    v_expected := true;
  END;
  IF NOT v_expected THEN
    RAISE EXCEPTION '감사 로그 실패 조건이 재현되지 않음';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.company_documents
    WHERE id = v_document
      AND storage_path = v_document_path
  ) THEN
    RAISE EXCEPTION '감사 로그 실패 시 자료 변경이 롤백되지 않음';
  END IF;

  SELECT count(*)
  INTO v_permission_count
  FROM public.admin_role_permission_policies
  WHERE admin_role = '일반'
    AND enabled = true
    AND permission IN (
      'offboarding:read', 'offboarding:write',
      'seating:read', 'seating:write',
      'parking:read', 'parking:write',
      'corporate_card:read', 'corporate_card:write',
      'company_documents:read', 'company_documents:write'
    );
  IF v_permission_count <> 10 THEN
    RAISE EXCEPTION '일반 관리자 회사 운영 권한 정책이 변경됨: %', v_permission_count;
  END IF;

  IF has_table_privilege('authenticated', 'public.company_documents', 'SELECT')
    OR has_table_privilege('anon', 'public.company_documents', 'SELECT') THEN
    RAISE EXCEPTION '비공개 전사 자료 테이블에 직접 조회 권한이 부여됨';
  END IF;

  RAISE NOTICE 'PASS: company operations constraints and security checks';
END;
$$;

ROLLBACK;
