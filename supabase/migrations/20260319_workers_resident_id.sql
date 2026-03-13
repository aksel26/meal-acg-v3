-- workers 테이블에 주민등록번호 컬럼 추가
ALTER TABLE supervisor.workers
  ADD COLUMN IF NOT EXISTS resident_id text;
