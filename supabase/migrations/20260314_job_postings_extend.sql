-- =============================================================
-- job_postings 테이블 확장
-- 형태, 시프트, 플랫폼, 점심시간 컬럼 추가 + 상태값 확장
-- =============================================================

-- 새 컬럼 추가
ALTER TABLE supervisor.job_postings
  ADD COLUMN IF NOT EXISTS work_type text DEFAULT 'offline'
    CHECK (work_type IN ('online', 'offline')),
  ADD COLUMN IF NOT EXISTS shift_type text DEFAULT 'day'
    CHECK (shift_type IN ('day', 'night')),
  ADD COLUMN IF NOT EXISTS platform text,
  ADD COLUMN IF NOT EXISTS lunch_start time,
  ADD COLUMN IF NOT EXISTS lunch_end time;

-- 상태 CHECK 제약조건 업데이트 (in_progress, completed 추가)
ALTER TABLE supervisor.job_postings
  DROP CONSTRAINT IF EXISTS job_postings_status_check;

ALTER TABLE supervisor.job_postings
  ADD CONSTRAINT job_postings_status_check
    CHECK (status IN ('open', 'closed', 'draft', 'in_progress', 'completed'));

-- 상태 전이 트리거 업데이트
CREATE OR REPLACE FUNCTION supervisor.validate_job_posting_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status != OLD.status THEN
    IF NOT (
      (OLD.status = 'draft' AND NEW.status = 'open') OR
      (OLD.status = 'open' AND NEW.status = 'closed') OR
      (OLD.status = 'open' AND NEW.status = 'in_progress') OR
      (OLD.status = 'in_progress' AND NEW.status = 'completed') OR
      (OLD.status = 'in_progress' AND NEW.status = 'closed')
    ) THEN
      RAISE EXCEPTION 'Invalid job posting status transition: % → %', OLD.status, NEW.status;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
