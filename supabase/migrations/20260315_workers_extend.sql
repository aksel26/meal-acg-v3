-- workers 테이블 확장: 성별, 경력, 주소, 경고 추가
ALTER TABLE supervisor.workers
  ADD COLUMN IF NOT EXISTS gender text CHECK (gender IN ('male', 'female')),
  ADD COLUMN IF NOT EXISTS experience text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS warning text;
