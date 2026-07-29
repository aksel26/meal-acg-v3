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
  v_auto_count integer;
  v_auto_date date;
  v_auto_title text;
  v_member_c uuid := gen_random_uuid();
  v_onboarding uuid;
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

  IF NOT EXISTS (
    SELECT 1
    FROM public.parking_registrations
    WHERE member_id = v_member_a
      AND vehicle_plate = '12가 3456'
      AND ticket_code = 'two_hours'
      AND usage_type = 'business'
  ) THEN
    RAISE EXCEPTION '주차 등록 기본 시간권 또는 구분이 적용되지 않음';
  END IF;

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

  INSERT INTO public.parking_registrations (
    member_id, vehicle_plate, vehicle_name, vehicle_type,
    requested_start_date, requested_end_date, ticket_code, usage_type
  )
  VALUES (
    v_member_b, '98나 7654', '차량 C', '승용',
    DATE '2099-04-02', DATE '2099-04-02',
    'extra_3_hours', 'personal'
  );

  IF NOT EXISTS (
    SELECT 1
    FROM public.parking_registrations
    WHERE member_id = v_member_b
      AND vehicle_plate = '98나 7654'
      AND requested_start_date = requested_end_date
      AND ticket_code = 'extra_3_hours'
      AND usage_type = 'personal'
  ) THEN
    RAISE EXCEPTION '주차 단일 일자와 시간권 등록이 저장되지 않음';
  END IF;

  v_expected := false;
  BEGIN
    INSERT INTO public.parking_registrations (
      member_id, vehicle_plate, vehicle_name, vehicle_type,
      requested_start_date, requested_end_date, ticket_code
    )
    VALUES (
      v_member_b, '77다 7777', '차량 D', '승용',
      DATE '2099-04-03', DATE '2099-04-03', 'all_day'
    );
  EXCEPTION WHEN check_violation THEN
    v_expected := true;
  END;
  IF NOT v_expected THEN
    RAISE EXCEPTION '허용되지 않은 주차 시간권이 차단되지 않음';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.parking_notice_settings
    WHERE id = 'default'
      AND content ->> 'type' = 'doc'
  ) THEN
    RAISE EXCEPTION '주차 공지 기본 문서가 생성되지 않음';
  END IF;

  IF has_table_privilege(
    'authenticated',
    'public.parking_notice_settings',
    'SELECT'
  ) OR has_table_privilege(
    'anon',
    'public.parking_notice_settings',
    'SELECT'
  ) THEN
    RAISE EXCEPTION '주차 공지 설정에 직접 조회 권한이 부여됨';
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

  -- 등록된 프리셋이 함께 복사됐을 수 있으므로 남은 항목을 모두 완료 처리한다.
  UPDATE public.offboarding_checklist_items
  SET is_completed = true,
      completed_at = now()
  WHERE offboarding_request_id = v_offboarding
    AND NOT is_completed;

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

  INSERT INTO public.member_statuses (member_id, status, start_date, note)
  VALUES (v_member_b, '퇴사', DATE '2099-11-30', '자동 연동 테스트');

  SELECT count(*), min(requested_final_working_date)
  INTO v_auto_count, v_auto_date
  FROM public.offboarding_requests
  WHERE member_id = v_member_b;
  IF v_auto_count <> 1 THEN
    RAISE EXCEPTION '퇴사 설정 시 오프보딩이 자동 생성되지 않음 (%건)', v_auto_count;
  END IF;
  IF v_auto_date <> DATE '2099-11-30' THEN
    RAISE EXCEPTION '자동 생성된 오프보딩의 최종 근무일이 퇴사일과 다름';
  END IF;

  UPDATE public.member_statuses
  SET start_date = DATE '2099-12-01'
  WHERE member_id = v_member_b AND status = '퇴사';

  SELECT count(*) INTO v_auto_count
  FROM public.offboarding_requests
  WHERE member_id = v_member_b;
  IF v_auto_count <> 1 THEN
    RAISE EXCEPTION '퇴사 정보 수정 시 오프보딩이 중복 생성됨 (%건)', v_auto_count;
  END IF;

  INSERT INTO public.offboarding_checklist_presets (
    title, description, sort_order, is_active
  )
  VALUES
    ('프리셋 활성 항목', '세부내용 복사 확인', 0, true),
    ('프리셋 비활성 항목', NULL, 1, false);

  INSERT INTO public.offboarding_requests (
    member_id, requested_final_working_date, reason
  )
  VALUES (v_member_a, DATE '2099-12-01', '프리셋 적용 테스트')
  RETURNING id INTO v_offboarding;

  -- 이미 등록된 운영용 프리셋이 있을 수 있으므로 개수 대신 항목 단위로 확인한다.
  SELECT count(*) INTO v_auto_count
  FROM public.offboarding_checklist_items
  WHERE offboarding_request_id = v_offboarding
    AND title = '프리셋 비활성 항목';
  IF v_auto_count <> 0 THEN
    RAISE EXCEPTION '비활성 프리셋이 요청에 복사됨';
  END IF;

  SELECT count(*), min(description)
  INTO v_auto_count, v_auto_title
  FROM public.offboarding_checklist_items
  WHERE offboarding_request_id = v_offboarding
    AND title = '프리셋 활성 항목';
  IF v_auto_count <> 1 THEN
    RAISE EXCEPTION
      '활성 프리셋이 요청에 복사되지 않음 (실제 %건)', v_auto_count;
  END IF;
  IF v_auto_title IS DISTINCT FROM '세부내용 복사 확인' THEN
    RAISE EXCEPTION '체크 항목 세부내용이 프리셋에서 복사되지 않음';
  END IF;

  -- 온보딩: 신규 인원 등록 → 온보딩 자동 생성 → 활성 프리셋 적용
  INSERT INTO public.onboarding_checklist_presets (
    title, description, sort_order, is_active
  )
  VALUES
    ('온보딩 활성 항목', '온보딩 세부내용', 0, true),
    ('온보딩 비활성 항목', NULL, 1, false);

  INSERT INTO public.members (id, login_id, password, full_name, hire_date)
  VALUES (
    v_member_c, 'ops-c-' || v_member_c, 'test-only', 'Ops Member C',
    DATE '2099-03-02'
  );

  SELECT id, start_date INTO v_onboarding, v_auto_date
  FROM public.onboarding_requests
  WHERE member_id = v_member_c;
  IF v_onboarding IS NULL THEN
    RAISE EXCEPTION '신규 인원 등록 시 온보딩이 자동 생성되지 않음';
  END IF;
  IF v_auto_date <> DATE '2099-03-02' THEN
    RAISE EXCEPTION '온보딩 시작일이 입사일과 다름';
  END IF;

  SELECT count(*) INTO v_auto_count
  FROM public.onboarding_checklist_items
  WHERE onboarding_request_id = v_onboarding
    AND title = '온보딩 비활성 항목';
  IF v_auto_count <> 0 THEN
    RAISE EXCEPTION '비활성 온보딩 프리셋이 복사됨';
  END IF;

  SELECT count(*), min(description)
  INTO v_auto_count, v_auto_title
  FROM public.onboarding_checklist_items
  WHERE onboarding_request_id = v_onboarding
    AND title = '온보딩 활성 항목';
  IF v_auto_count <> 1 THEN
    RAISE EXCEPTION
      '활성 온보딩 프리셋이 복사되지 않음 (실제 %건)', v_auto_count;
  END IF;
  IF v_auto_title IS DISTINCT FROM '온보딩 세부내용' THEN
    RAISE EXCEPTION '온보딩 체크 항목 세부내용이 복사되지 않음';
  END IF;

  -- 미완료 항목이 남아 있으면 완료를 거부한다
  v_expected := false;
  BEGIN
    PERFORM public.complete_onboarding_request(v_onboarding);
  EXCEPTION WHEN invalid_parameter_value THEN
    v_expected := SQLERRM = 'ONBOARDING_CHECKLIST_INCOMPLETE';
  END;
  IF NOT v_expected THEN
    RAISE EXCEPTION '미완료 항목이 있는 온보딩 완료가 차단되지 않음';
  END IF;

  UPDATE public.onboarding_checklist_items
  SET is_completed = true,
      completed_at = now()
  WHERE onboarding_request_id = v_onboarding;

  PERFORM public.complete_onboarding_request(v_onboarding);

  -- 완료된 온보딩의 체크 항목은 잠긴다
  v_expected := false;
  BEGIN
    UPDATE public.onboarding_checklist_items
    SET is_completed = false,
        completed_at = NULL
    WHERE onboarding_request_id = v_onboarding;
  EXCEPTION WHEN invalid_parameter_value THEN
    v_expected := SQLERRM = 'ONBOARDING_CHECKLIST_LOCKED';
  END;
  IF NOT v_expected THEN
    RAISE EXCEPTION '완료된 온보딩 체크리스트 변경이 차단되지 않음';
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
