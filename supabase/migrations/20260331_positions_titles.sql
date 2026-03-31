-- positions/titles 테이블 생성 및 member_role 데이터 마이그레이션

-- 1. positions 테이블 (직급)
CREATE TABLE IF NOT EXISTS "public"."positions" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "name" text NOT NULL,
    "sort_order" integer NOT NULL,
    "annual_leave_days" integer NOT NULL DEFAULT 0,
    "leave_accrual_rule" text NOT NULL DEFAULT 'none',
    "created_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now(),
    CONSTRAINT "positions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "positions_name_key" UNIQUE ("name"),
    CONSTRAINT "positions_leave_accrual_rule_check" CHECK (leave_accrual_rule IN ('none', 'fixed', '+1_per_3yr'))
);

ALTER TABLE "public"."positions" OWNER TO "postgres";

-- 2. titles 테이블 (직책)
CREATE TABLE IF NOT EXISTS "public"."titles" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "name" text NOT NULL,
    "sort_order" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now(),
    CONSTRAINT "titles_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "titles_name_key" UNIQUE ("name")
);

ALTER TABLE "public"."titles" OWNER TO "postgres";

-- 3. 초기 데이터 삽입
INSERT INTO "public"."positions" ("name", "sort_order", "annual_leave_days", "leave_accrual_rule") VALUES
    ('인턴',   1,  0, 'none'),
    ('사원',   2, 15, 'fixed'),
    ('선임',   3, 16, '+1_per_3yr'),
    ('책임',   4, 16, '+1_per_3yr'),
    ('수석',   5, 16, '+1_per_3yr'),
    ('대표',   6, 16, '+1_per_3yr');

INSERT INTO "public"."titles" ("name", "sort_order") VALUES
    ('파트장', 1),
    ('팀장',   2),
    ('본부장', 3),
    ('대표',   4);

-- 4. members 테이블에 position_id, title_id 컬럼 추가
ALTER TABLE "public"."members"
    ADD COLUMN IF NOT EXISTS "position_id" uuid,
    ADD COLUMN IF NOT EXISTS "title_id" uuid;

-- 5. 기존 member_role 데이터를 position_id / title_id 로 마이그레이션
-- 인턴 → position: 인턴
UPDATE "public"."members"
SET "position_id" = (SELECT id FROM "public"."positions" WHERE name = '인턴')
WHERE "member_role" = '인턴';

-- 팀장 → position: 사원, title: 팀장
UPDATE "public"."members"
SET
    "position_id" = (SELECT id FROM "public"."positions" WHERE name = '사원'),
    "title_id"    = (SELECT id FROM "public"."titles"    WHERE name = '팀장')
WHERE "member_role" = '팀장';

-- 본부장 → position: 사원, title: 본부장
UPDATE "public"."members"
SET
    "position_id" = (SELECT id FROM "public"."positions" WHERE name = '사원'),
    "title_id"    = (SELECT id FROM "public"."titles"    WHERE name = '본부장')
WHERE "member_role" = '본부장';

-- 팀원 → position: 사원
UPDATE "public"."members"
SET "position_id" = (SELECT id FROM "public"."positions" WHERE name = '사원')
WHERE "member_role" = '팀원';

-- 나머지 NULL → position: 사원
UPDATE "public"."members"
SET "position_id" = (SELECT id FROM "public"."positions" WHERE name = '사원')
WHERE "position_id" IS NULL;

-- position_id 기본값을 '사원' ID로 설정하는 함수
-- (seed.sql 등 INSERT 시 position_id 미지정 시 '사원'으로 자동 설정)
CREATE OR REPLACE FUNCTION "public"."default_position_id"() RETURNS uuid
    LANGUAGE sql STABLE
    AS $$
        SELECT id FROM public.positions WHERE name = '사원' LIMIT 1;
    $$;

ALTER FUNCTION "public"."default_position_id"() OWNER TO "postgres";

ALTER TABLE "public"."members"
    ALTER COLUMN "position_id" SET DEFAULT "public"."default_position_id"();

-- position_id NOT NULL 제약 추가
ALTER TABLE "public"."members"
    ALTER COLUMN "position_id" SET NOT NULL;

-- 6. FK 및 인덱스 추가
ALTER TABLE "public"."members"
    ADD CONSTRAINT "members_position_id_fkey"
        FOREIGN KEY ("position_id") REFERENCES "public"."positions"("id"),
    ADD CONSTRAINT "members_title_id_fkey"
        FOREIGN KEY ("title_id") REFERENCES "public"."titles"("id");

CREATE INDEX IF NOT EXISTS "idx_members_position_id" ON "public"."members" USING btree ("position_id");
CREATE INDEX IF NOT EXISTS "idx_members_title_id"    ON "public"."members" USING btree ("title_id");

-- 7. updated_at 트리거 등록
CREATE OR REPLACE TRIGGER "set_positions_updated_at"
    BEFORE UPDATE ON "public"."positions"
    FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

CREATE OR REPLACE TRIGGER "set_titles_updated_at"
    BEFORE UPDATE ON "public"."titles"
    FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

-- 8. member_current_status VIEW 재생성 (position_id, title_id, position_name, title_name 추가)
CREATE OR REPLACE VIEW "public"."member_current_status" AS
 SELECT "m"."id" AS "member_id",
    "m"."full_name",
    "m"."member_role",
    "m"."email",
    "m"."team_id",
    "m"."division_id",
    "t"."name" AS "team_name",
    "d"."name" AS "division_name",
    "ms"."id" AS "status_id",
    "ms"."status" AS "current_status",
    "ms"."start_date" AS "status_start_date",
    "ms"."end_date" AS "status_end_date",
    "ms"."note" AS "status_note",
    "m"."position_id",
    "m"."title_id",
    "p"."name" AS "position_name",
    "ti"."name" AS "title_name"
   FROM (((("public"."members" "m"
     LEFT JOIN "public"."teams" "t" ON (("m"."team_id" = "t"."id")))
     LEFT JOIN "public"."divisions" "d" ON (("m"."division_id" = "d"."id")))
     LEFT JOIN "public"."positions" "p" ON (("m"."position_id" = "p"."id")))
     LEFT JOIN "public"."titles" "ti" ON (("m"."title_id" = "ti"."id")))
     LEFT JOIN LATERAL ( SELECT "ms_1"."id",
            "ms_1"."member_id",
            "ms_1"."status",
            "ms_1"."start_date",
            "ms_1"."end_date",
            "ms_1"."note",
            "ms_1"."created_at",
            "ms_1"."updated_at"
           FROM "public"."member_statuses" "ms_1"
          WHERE ("ms_1"."member_id" = "m"."id")
          ORDER BY
                CASE
                    WHEN (("ms_1"."end_date" IS NULL) OR (CURRENT_DATE <= "ms_1"."end_date")) THEN 0
                    ELSE 1
                END, "ms_1"."start_date" DESC
         LIMIT 1) "ms" ON (true);

ALTER VIEW "public"."member_current_status" OWNER TO "postgres";
