-- 20260724130000_leave_two_step_approval.sql
-- ============ SECTION 1: 스키마 ============

-- 1a. dayoffs 2단계 승인 컬럼
ALTER TABLE dayoffs
  ADD COLUMN IF NOT EXISTS first_approver_id uuid REFERENCES members(id),
  ADD COLUMN IF NOT EXISTS first_approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS final_approver_id uuid REFERENCES members(id),
  ADD COLUMN IF NOT EXISTS final_approved_at timestamptz;

COMMENT ON COLUMN dayoffs.first_approver_id IS '1차 가승인자 (신청자 지정)';
COMMENT ON COLUMN dayoffs.final_approver_id IS '2차 최종승인자 (P&C)';

-- 1b. approval_status CHECK 에 pre_approved 추가
ALTER TABLE dayoffs DROP CONSTRAINT IF EXISTS dayoffs_approval_status_check;
ALTER TABLE dayoffs ADD CONSTRAINT dayoffs_approval_status_check
  CHECK (approval_status IN ('draft','pending','pre_approved','approved','rejected'));

-- 1c. approval_requests.status CHECK 에 pre_approved 추가
ALTER TABLE approval_requests DROP CONSTRAINT IF EXISTS approval_requests_status_check;
ALTER TABLE approval_requests ADD CONSTRAINT approval_requests_status_check
  CHECK (status IN ('pending','pre_approved','approved','rejected'));

-- 1d. 중복방지 가드: pre_approved 포함 (prevent_duplicate_active_dayoff 재정의)
--     원본 20260722100600_leave_request_concurrency_and_fingerprint.sql 의
--     최신 정의를 그대로 복사하되 approval_status IN ('pending','approved') 2곳에
--     'pre_approved'를 추가한다.
CREATE OR REPLACE FUNCTION prevent_duplicate_active_dayoff()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.is_deleted = false
     AND NEW.approval_status IN ('pending', 'pre_approved', 'approved') THEN
    -- 서로 다른 request_id로 동시에 같은 날짜를 신청해도 검사 순서를 직렬화한다.
    PERFORM pg_advisory_xact_lock(
      hashtextextended(NEW.target_id::text || ':' || NEW.leave_date::text, 0)
    );

    IF EXISTS (
      SELECT 1
      FROM dayoffs d
      WHERE d.target_id = NEW.target_id
        AND d.leave_date = NEW.leave_date
        AND d.is_deleted = false
        AND d.approval_status IN ('pending', 'pre_approved', 'approved')
        AND d.id <> NEW.id
    ) THEN
      RAISE EXCEPTION 'LEAVE_REQUEST_DUPLICATE_DATE' USING ERRCODE = '23505';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
