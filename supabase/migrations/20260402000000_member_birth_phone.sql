-- members 테이블에 birth_date, phone, passport_number 컬럼 추가
ALTER TABLE "public"."members"
    ADD COLUMN IF NOT EXISTS "birth_date" date,
    ADD COLUMN IF NOT EXISTS "phone" text,
    ADD COLUMN IF NOT EXISTS "passport_number" text;

-- member_current_status VIEW 재생성 (login_id, created_at, birth_date, phone 추가)
DROP VIEW IF EXISTS "public"."member_current_status";
CREATE VIEW "public"."member_current_status" AS
 SELECT "m"."id" AS "member_id",
    "m"."full_name",
    "m"."member_role",
    "m"."email",
    "m"."login_id",
    "m"."birth_date",
    "m"."phone",
    "m"."passport_number",
    "m"."created_at",
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
