-- usage_records.no 는 trg_auto_assign_no 트리거가 BEFORE INSERT 시점에 채우지만,
-- 컬럼에 DEFAULT 가 없어 타입 생성기가 insert 필수 컬럼으로 취급한다.
-- 트리거가 항상 값을 덮어쓰므로 이 DEFAULT 가 실제로 사용되는 경우는 없다.
ALTER TABLE public.usage_records ALTER COLUMN no SET DEFAULT 0;
