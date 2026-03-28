-- 취합 건 관리 테이블 (음료 취합 리스트)
CREATE TABLE IF NOT EXISTS drink_collections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER,  -- NULL allowed for one-time collections
  is_active BOOLEAN DEFAULT true NOT NULL,
  is_one_time BOOLEAN DEFAULT false NOT NULL,
  drink_options JSONB DEFAULT '["HOT 아메리카노","ICE 아메리카노","HOT 디카페인 아메리카노","ICE 디카페인 아메리카노","바닐라크림 콜드브루","ICE 자몽허니블랙티","기타","선택안함"]'::jsonb,
  pickup_persons JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- monthly_drink_applications에 collection_id FK 추가
ALTER TABLE monthly_drink_applications
  ADD COLUMN IF NOT EXISTS collection_id UUID REFERENCES drink_collections(id);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_drink_collections_active ON drink_collections(is_active);
CREATE INDEX IF NOT EXISTS idx_drink_collections_year_month ON drink_collections(year, month);
CREATE INDEX IF NOT EXISTS idx_monthly_drink_applications_collection ON monthly_drink_applications(collection_id);

-- 데이터 마이그레이션: 3월/4월 취합 건 생성 + 기존 데이터 이관
DO $$
DECLARE
  march_collection_id UUID;
  april_collection_id UUID;
  default_options JSONB := '["HOT 아메리카노","ICE 아메리카노","HOT 디카페인 아메리카노","ICE 디카페인 아메리카노","바닐라크림 콜드브루","ICE 자몽허니블랙티","기타","선택안함"]'::jsonb;
  existing_options JSONB;
  existing_pickup JSONB;
BEGIN
  -- 기존 3월 설정 가져오기
  SELECT drink_options, pickup_persons INTO existing_options, existing_pickup
  FROM monthly_drink_settings WHERE year = 2026 AND month = 3;

  -- 3월 취합 건 생성 (비활성)
  INSERT INTO drink_collections (title, year, month, is_active, is_one_time, drink_options, pickup_persons)
  VALUES ('3월 음료 취합', 2026, 3, false, false,
    COALESCE(existing_options, default_options),
    COALESCE(existing_pickup, '[]'::jsonb))
  RETURNING id INTO march_collection_id;

  -- 4월 취합 건 생성 (활성)
  INSERT INTO drink_collections (title, year, month, is_active, is_one_time, drink_options, pickup_persons)
  VALUES ('4월 음료 취합', 2026, 4, true, false, default_options, '[]'::jsonb)
  RETURNING id INTO april_collection_id;

  -- 기존 3월 신청 데이터를 4월 취합 건으로 이관
  UPDATE monthly_drink_applications
  SET collection_id = april_collection_id, month = 4
  WHERE year = 2026 AND month = 3 AND collection_id IS NULL;
END $$;
