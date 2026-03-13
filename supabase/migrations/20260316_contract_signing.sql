-- assignments 테이블에 계약 서명 관련 컬럼 추가
ALTER TABLE supervisor.assignments
  ADD COLUMN IF NOT EXISTS contract_status text CHECK (contract_status IN ('signed', 'confirmed')),
  ADD COLUMN IF NOT EXISTS signature_image_path text,
  ADD COLUMN IF NOT EXISTS signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS confirmed_at timestamptz;

-- signatures 스토리지 버킷 생성
INSERT INTO storage.buckets (id, name, public)
VALUES ('signatures', 'signatures', false)
ON CONFLICT (id) DO NOTHING;

-- service_role만 signatures 버킷 접근 허용
CREATE POLICY "Service role full access on signatures"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'signatures')
WITH CHECK (bucket_id = 'signatures');
