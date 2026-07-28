\set ON_ERROR_STOP on

BEGIN;

DO $$
DECLARE
  v_book_id uuid;
  v_first_member_id uuid;
  v_second_member_id uuid;
  v_first_rental_id uuid;
  v_second_rental_id uuid;
  v_expected_error boolean;
BEGIN
  INSERT INTO public.members (login_id, password, full_name)
  SELECT 'library-test-' || gen_random_uuid(), 'test-only', 'Library Test'
  FROM generate_series(1, greatest(0, 2 - (SELECT count(*) FROM public.members)));

  SELECT id
  INTO v_first_member_id
  FROM public.members
  ORDER BY id
  LIMIT 1;

  SELECT id
  INTO v_second_member_id
  FROM public.members
  WHERE id <> v_first_member_id
  ORDER BY id
  LIMIT 1;

  IF v_first_member_id IS NULL OR v_second_member_id IS NULL THEN
    RAISE EXCEPTION 'library test requires two seeded members';
  END IF;

  INSERT INTO public.books (title, author, status)
  VALUES ('도서관 회귀 테스트', 'Codex', 'available')
  RETURNING id INTO v_book_id;

  INSERT INTO public.book_rentals (book_id, requester_id, status)
  VALUES (v_book_id, v_first_member_id, 'pending')
  RETURNING id INTO v_first_rental_id;

  v_expected_error := false;
  BEGIN
    INSERT INTO public.book_rentals (book_id, requester_id, status)
    VALUES (v_book_id, v_first_member_id, 'pending');
  EXCEPTION WHEN unique_violation THEN
    v_expected_error := true;
  END;
  IF NOT v_expected_error THEN
    RAISE EXCEPTION 'duplicate pending request was not rejected';
  END IF;

  INSERT INTO public.book_rentals (book_id, requester_id, status)
  VALUES (v_book_id, v_second_member_id, 'pending')
  RETURNING id INTO v_second_rental_id;

  UPDATE public.book_rentals
  SET status = 'approved',
      approved_at = clock_timestamp(),
      rented_at = clock_timestamp(),
      due_at = clock_timestamp() + interval '14 days'
  WHERE id = v_first_rental_id;

  v_expected_error := false;
  BEGIN
    UPDATE public.book_rentals
    SET status = 'approved',
        approved_at = clock_timestamp(),
        rented_at = clock_timestamp(),
        due_at = clock_timestamp() + interval '14 days'
    WHERE id = v_second_rental_id;
  EXCEPTION WHEN unique_violation THEN
    v_expected_error := true;
  END;
  IF NOT v_expected_error THEN
    RAISE EXCEPTION 'second active rental was not rejected';
  END IF;

  UPDATE public.book_rentals
  SET status = 'return_requested',
      return_requested_at = clock_timestamp()
  WHERE id = v_first_rental_id;

  UPDATE public.book_rentals
  SET status = 'returned',
      returned_at = clock_timestamp()
  WHERE id = v_first_rental_id;

  IF EXISTS (
    SELECT 1
    FROM public.book_rentals
    WHERE book_id = v_book_id
      AND status IN ('approved', 'return_requested')
      AND returned_at IS NULL
  ) THEN
    RAISE EXCEPTION 'returned rental remained active';
  END IF;

  UPDATE public.books
  SET status = 'disabled'
  WHERE id = v_book_id;

  IF (SELECT status FROM public.books WHERE id = v_book_id) <> 'disabled' THEN
    RAISE EXCEPTION 'book could not be disabled';
  END IF;
END;
$$;

ROLLBACK;
