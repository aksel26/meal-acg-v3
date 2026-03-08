


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "btree_gist" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."budget_type" AS ENUM (
    '복지포인트',
    '활동비'
);


ALTER TYPE "public"."budget_type" OWNER TO "postgres";


CREATE TYPE "public"."member_role" AS ENUM (
    '본부장',
    '팀장',
    '팀원',
    '인턴'
);


ALTER TYPE "public"."member_role" OWNER TO "postgres";


CREATE TYPE "public"."member_status_type" AS ENUM (
    '육아휴직',
    '병가',
    '재택근무',
    '파견',
    '휴직',
    '퇴사'
);


ALTER TYPE "public"."member_status_type" OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."usage_records" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "allocation_id" "uuid" NOT NULL,
    "member_id" "uuid" NOT NULL,
    "type" "public"."budget_type" NOT NULL,
    "amount" integer NOT NULL,
    "description" "text" NOT NULL,
    "used_at" "date" NOT NULL,
    "companions" "uuid"[] DEFAULT '{}'::"uuid"[],
    "receipt_url" "text",
    "is_reviewed" boolean DEFAULT false,
    "reviewed_by" "uuid",
    "reviewed_at" timestamp with time zone,
    "last_modified_by" "uuid",
    "last_modified_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "notes" "text",
    "delay_reason" "text",
    "review_status" smallint DEFAULT 0 NOT NULL,
    "first_reviewed_by" "uuid",
    "first_reviewed_at" timestamp with time zone,
    "second_reviewed_by" "uuid",
    "second_reviewed_at" timestamp with time zone,
    "no" integer NOT NULL
);


ALTER TABLE "public"."usage_records" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."advance_review_status"("p_usage_record_id" "uuid", "p_reviewer_id" "uuid") RETURNS SETOF "public"."usage_records"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  UPDATE usage_records SET
    review_status = CASE
      WHEN review_status = 0 THEN 1
      WHEN review_status = 1 THEN 2
      ELSE review_status END,
    first_reviewed_by  = CASE WHEN review_status = 0 THEN p_reviewer_id ELSE first_reviewed_by END,
    first_reviewed_at  = CASE WHEN review_status = 0 THEN now() ELSE first_reviewed_at END,
    second_reviewed_by = CASE WHEN review_status = 1 THEN p_reviewer_id ELSE second_reviewed_by END,
    second_reviewed_at = CASE WHEN review_status = 1 THEN now() ELSE second_reviewed_at END,
    reviewed_by = CASE WHEN review_status = 1 THEN p_reviewer_id ELSE reviewed_by END,
    reviewed_at = CASE WHEN review_status = 1 THEN now() ELSE reviewed_at END,
    last_modified_by = p_reviewer_id,
    last_modified_at = now()
  WHERE id = p_usage_record_id
  RETURNING *;
END;
$$;


ALTER FUNCTION "public"."advance_review_status"("p_usage_record_id" "uuid", "p_reviewer_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."authenticate_user"("p_login_id" "text", "p_password" "text") RETURNS TABLE("user_id" "uuid", "full_name" "text", "role" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT m.id, m.full_name, m.role
  FROM members m
  WHERE m.login_id = p_login_id AND m.password = p_password;
END;
$$;


ALTER FUNCTION "public"."authenticate_user"("p_login_id" "text", "p_password" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auto_assign_usage_record_no"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.no IS NULL THEN
    PERFORM pg_advisory_xact_lock(hashtext('usage_records_no'));
    SELECT COALESCE(MAX(no), 0) + 1 INTO NEW.no FROM usage_records;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."auto_assign_usage_record_no"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_activity_budget"("p_member_id" "uuid", "p_base_amount" integer DEFAULT 150000, "p_per_member_amount" integer DEFAULT 150000, "p_additional_count" integer DEFAULT 0, "p_additional_per_amount" integer DEFAULT 0) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_team_count INTEGER;
  v_role member_role;
  v_result INTEGER;
BEGIN
  SELECT member_role INTO v_role FROM members WHERE id = p_member_id;
  
  IF v_role = '팀원' THEN
    RAISE EXCEPTION '팀원에게는 활동비를 할당할 수 없습니다.';
  END IF;

  SELECT COUNT(*) INTO v_team_count
  FROM members
  WHERE team_id = (SELECT team_id FROM members WHERE id = p_member_id)
    AND id != p_member_id;

  v_result := p_base_amount + (p_per_member_amount * v_team_count)
            + (p_additional_per_amount * p_additional_count);

  RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."calculate_activity_budget"("p_member_id" "uuid", "p_base_amount" integer, "p_per_member_amount" integer, "p_additional_count" integer, "p_additional_per_amount" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_popular_restaurants"("limit_count" integer DEFAULT 10) RETURNS TABLE("name" "text", "count" bigint)
    LANGUAGE "plpgsql" STABLE
    AS $$
BEGIN
  RETURN QUERY
  WITH all_stores AS (
    -- Collect all restaurant names from breakfast, lunch, and dinner
    -- Apply normalization to reduce duplicates
    SELECT normalize_restaurant_name(breakfast_store) as store_name
    FROM meal_logs
    WHERE breakfast_store IS NOT NULL
      AND TRIM(breakfast_store) != ''

    UNION ALL

    SELECT normalize_restaurant_name(lunch_store)
    FROM meal_logs
    WHERE lunch_store IS NOT NULL
      AND TRIM(lunch_store) != ''

    UNION ALL

    SELECT normalize_restaurant_name(dinner_store)
    FROM meal_logs
    WHERE dinner_store IS NOT NULL
      AND TRIM(dinner_store) != ''
  )
  SELECT
    store_name::TEXT as name,
    COUNT(*)::BIGINT as count
  FROM all_stores
  WHERE store_name IS NOT NULL  -- Filter out NULL results from normalization
  GROUP BY store_name
  ORDER BY count DESC
  LIMIT limit_count;
END;
$$;


ALTER FUNCTION "public"."get_popular_restaurants"("limit_count" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_popular_restaurants"("limit_count" integer) IS 'Aggregates restaurant visits from meal_logs (breakfast, lunch, dinner) and returns top N most popular restaurants.
Uses normalize_restaurant_name() for advanced normalization (lowercase, branch name removal, etc.).';



CREATE OR REPLACE FUNCTION "public"."get_user_monthly_stats"("p_year" integer, "p_month" integer, "p_user_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("user_id" "uuid", "full_name" "text", "login_id" "text", "work_days" bigint, "holiday_count" bigint, "public_holiday_count" bigint, "daily_allowance" integer, "original_allowance" bigint, "individual_meal_deduction" bigint, "no_meal_deduction" bigint, "half_day_deduction" bigint, "holiday_deduction" bigint, "total_deduction" bigint, "total_allowance" bigint, "total_used" bigint, "balance" bigint, "weekend_work_days" bigint, "individual_meals" bigint, "remote_work_days" bigint, "half_day_off_count" bigint, "annual_leave_days" bigint, "day_off_days" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ums.user_id,
    ums.full_name,
    ums.login_id,
    ums.work_days,
    ums.holiday_count,
    ums.public_holiday_count,
    ums.daily_allowance::INTEGER,
    ums.original_allowance::BIGINT,
    ums.individual_meal_deduction::BIGINT,
    ums.no_meal_deduction::BIGINT,
    ums.half_day_deduction::BIGINT,
    ums.holiday_deduction::BIGINT,
    ums.total_deduction::BIGINT,
    ums.total_allowance::BIGINT,
    ums.total_used::BIGINT,
    ums.balance::BIGINT,
    ums.weekend_work_days,
    ums.individual_meals,
    ums.remote_work_days,
    ums.half_day_off_count,
    ums.annual_leave_days,
    ums.day_off_days
  FROM user_monthly_stats ums
  WHERE ums.year = p_year 
    AND ums.month = p_month
    AND (p_user_id IS NULL OR ums.user_id = p_user_id)
  ORDER BY ums.full_name;
END;
$$;


ALTER FUNCTION "public"."get_user_monthly_stats"("p_year" integer, "p_month" integer, "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_reviewed_record_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF OLD.is_reviewed = TRUE THEN
    INSERT INTO usage_record_audit_logs (
      usage_record_id,
      action,
      changed_by,
      previous_data,
      new_data
    ) VALUES (
      OLD.id,
      TG_OP,
      COALESCE(OLD.last_modified_by, OLD.member_id),
      to_jsonb(OLD),
      CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END
    );
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."log_reviewed_record_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."normalize_restaurant_name"("name" "text") RETURNS "text"
    LANGUAGE "plpgsql" IMMUTABLE
    AS $_$
BEGIN
  IF name IS NULL OR TRIM(name) = '' THEN
    RETURN NULL;
  END IF;

  RETURN TRIM(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        REGEXP_REPLACE(
          REGEXP_REPLACE(
            LOWER(TRIM(name)),
            '\s*[\(（].*?[\)）]\s*', '', 'g'  -- Remove (branch name)
          ),
          '\s*[-–—]\s*.*$', ''  -- Remove - branch name
        ),
        '\s+(점|지점|매장|본점)$', ''  -- Remove trailing 점/지점/매장/본점
      ),
      '\s+', ' ', 'g'  -- Normalize multiple spaces to single space
    )
  );
END;
$_$;


ALTER FUNCTION "public"."normalize_restaurant_name"("name" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."normalize_restaurant_name"("name" "text") IS 'Normalizes restaurant names by:
1. Converting to lowercase
2. Removing parenthetical branch names
3. Removing branch names after hyphens
4. Removing trailing store indicators (점, 지점, 매장, 본점)
5. Normalizing whitespace';



CREATE OR REPLACE FUNCTION "public"."revert_review_status"("p_usage_record_id" "uuid", "p_reviewer_id" "uuid", "p_target_status" smallint) RETURNS SETOF "public"."usage_records"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  UPDATE usage_records SET
    review_status = p_target_status,
    first_reviewed_by  = CASE WHEN p_target_status < 1 THEN NULL ELSE first_reviewed_by END,
    first_reviewed_at  = CASE WHEN p_target_status < 1 THEN NULL ELSE first_reviewed_at END,
    second_reviewed_by = CASE WHEN p_target_status < 2 THEN NULL ELSE second_reviewed_by END,
    second_reviewed_at = CASE WHEN p_target_status < 2 THEN NULL ELSE second_reviewed_at END,
    reviewed_by = CASE WHEN p_target_status < 2 THEN NULL ELSE reviewed_by END,
    reviewed_at = CASE WHEN p_target_status < 2 THEN NULL ELSE reviewed_at END,
    last_modified_by = p_reviewer_id,
    last_modified_at = now()
  WHERE id = p_usage_record_id
  RETURNING *;
END;
$$;


ALTER FUNCTION "public"."revert_review_status"("p_usage_record_id" "uuid", "p_reviewer_id" "uuid", "p_target_status" smallint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_is_reviewed"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.is_reviewed := (NEW.review_status = 2);
  IF NEW.review_status = 2 THEN
    NEW.reviewed_by := COALESCE(NEW.reviewed_by, NEW.second_reviewed_by);
    NEW.reviewed_at := COALESCE(NEW.reviewed_at, NEW.second_reviewed_at);
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_is_reviewed"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_meal_log_changes"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO sync_queue (operation, table_name, record_id, payload)
    VALUES ('INSERT', TG_TABLE_NAME, NEW.id, row_to_json(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO sync_queue (operation, table_name, record_id, payload)
    VALUES ('UPDATE', TG_TABLE_NAME, NEW.id, row_to_json(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO sync_queue (operation, table_name, record_id, payload)
    VALUES ('DELETE', TG_TABLE_NAME, OLD.id, row_to_json(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."sync_meal_log_changes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."toggle_review_status"("p_usage_record_id" "uuid", "p_reviewer_id" "uuid") RETURNS "public"."usage_records"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_record usage_records;
BEGIN
  UPDATE usage_records
  SET
    is_reviewed = NOT is_reviewed,
    reviewed_by = CASE WHEN NOT is_reviewed THEN p_reviewer_id ELSE NULL END,
    reviewed_at = CASE WHEN NOT is_reviewed THEN now() ELSE NULL END
  WHERE id = p_usage_record_id
  RETURNING * INTO v_record;

  RETURN v_record;
END;
$$;


ALTER FUNCTION "public"."toggle_review_status"("p_usage_record_id" "uuid", "p_reviewer_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."budget_allocations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "member_id" "uuid" NOT NULL,
    "type" "public"."budget_type" NOT NULL,
    "period" "text" NOT NULL,
    "total_amount" integer DEFAULT 0 NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."budget_allocations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."divisions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."divisions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "login_id" "text" NOT NULL,
    "password" "text" NOT NULL,
    "full_name" "text" NOT NULL,
    "role" "text" DEFAULT 'user'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "email" "text",
    "organization_id" "uuid",
    "division_id" "uuid",
    "team_id" "uuid",
    "member_role" "public"."member_role" DEFAULT '팀원'::"public"."member_role" NOT NULL,
    "note" "text",
    "intern_months" integer,
    CONSTRAINT "members_role_check" CHECK (("role" = ANY (ARRAY['user'::"text", 'admin'::"text"])))
);


ALTER TABLE "public"."members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."teams" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "division_id" "uuid",
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."teams" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."budget_summary" AS
 SELECT "ba"."id" AS "allocation_id",
    "ba"."member_id",
    "m"."full_name" AS "member_name",
    "m"."member_role",
    "t"."name" AS "team_name",
    "d"."name" AS "division_name",
    "ba"."type",
    "ba"."period",
    "ba"."total_amount",
    "ba"."description",
    (COALESCE("sum"("ur"."amount"), (0)::bigint))::integer AS "used_amount",
    (("ba"."total_amount" - COALESCE("sum"("ur"."amount"), (0)::bigint)))::integer AS "remaining_amount",
    ("count"("ur"."id"))::integer AS "usage_count",
    ("count"("ur"."id") FILTER (WHERE ("ur"."is_reviewed" = true)))::integer AS "reviewed_count"
   FROM (((("public"."budget_allocations" "ba"
     JOIN "public"."members" "m" ON (("ba"."member_id" = "m"."id")))
     LEFT JOIN "public"."teams" "t" ON (("m"."team_id" = "t"."id")))
     LEFT JOIN "public"."divisions" "d" ON (("m"."division_id" = "d"."id")))
     LEFT JOIN "public"."usage_records" "ur" ON (("ur"."allocation_id" = "ba"."id")))
  GROUP BY "ba"."id", "ba"."member_id", "m"."full_name", "m"."member_role", "t"."name", "d"."name", "ba"."type", "ba"."period", "ba"."total_amount", "ba"."description";


ALTER VIEW "public"."budget_summary" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."global_settings" (
    "id" integer DEFAULT 1 NOT NULL,
    "daily_allowance" integer DEFAULT 10000 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "monthly_allowances" "jsonb" DEFAULT '{}'::"jsonb",
    CONSTRAINT "global_settings_id_check" CHECK (("id" = 1))
);


ALTER TABLE "public"."global_settings" OWNER TO "postgres";


COMMENT ON COLUMN "public"."global_settings"."monthly_allowances" IS '월별 지원금 설정. 형식: {"2026": {"1": {"allowance": 220000, "workdays": 22}, "2": {...}, ...}}';



CREATE TABLE IF NOT EXISTS "public"."holidays" (
    "holiday_date" "date" NOT NULL,
    "description" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."holidays" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lunch_fixed_schedules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "day_of_week" integer NOT NULL,
    "user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "label" character varying(100),
    CONSTRAINT "chk_user_or_label" CHECK (((("user_id" IS NOT NULL) AND ("label" IS NULL)) OR (("user_id" IS NULL) AND ("label" IS NOT NULL)))),
    CONSTRAINT "lunch_fixed_schedules_day_of_week_check" CHECK ((("day_of_week" >= 1) AND ("day_of_week" <= 5)))
);


ALTER TABLE "public"."lunch_fixed_schedules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lunch_group_excluded_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "member_id" "uuid" NOT NULL,
    "week_start_date" "date" NOT NULL,
    "excluded_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."lunch_group_excluded_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lunch_group_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "group_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "assigned_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."lunch_group_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lunch_group_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "max_members_per_group" integer DEFAULT 4 NOT NULL,
    "total_groups" integer DEFAULT 5 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."lunch_group_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lunch_groups" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "group_number" integer NOT NULL,
    "week_start_date" "date" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "max_slots" integer DEFAULT 4
);


ALTER TABLE "public"."lunch_groups" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."meal_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "entry_date" "date" NOT NULL,
    "attendance" "text",
    "breakfast_store" "text",
    "breakfast_amount" integer DEFAULT 0,
    "breakfast_payer" "text",
    "lunch_store" "text",
    "lunch_amount" integer DEFAULT 0,
    "lunch_payer" "text",
    "dinner_store" "text",
    "dinner_amount" integer DEFAULT 0,
    "dinner_payer" "text",
    "total_amount" integer GENERATED ALWAYS AS (((COALESCE("breakfast_amount", 0) + COALESCE("lunch_amount", 0)) + COALESCE("dinner_amount", 0))) STORED,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."meal_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."member_statuses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "member_id" "uuid" NOT NULL,
    "status" "public"."member_status_type" NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date",
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."member_statuses" OWNER TO "postgres";


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
    "ms"."note" AS "status_note"
   FROM ((("public"."members" "m"
     LEFT JOIN "public"."teams" "t" ON (("m"."team_id" = "t"."id")))
     LEFT JOIN "public"."divisions" "d" ON (("m"."division_id" = "d"."id")))
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
         LIMIT 1) "ms" ON (true));


ALTER VIEW "public"."member_current_status" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."monthly_allowances" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "year" integer NOT NULL,
    "month" integer NOT NULL,
    "allowance_amount" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "monthly_allowances_month_check" CHECK ((("month" >= 1) AND ("month" <= 12)))
);


ALTER TABLE "public"."monthly_allowances" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."monthly_drink_applications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "year" integer NOT NULL,
    "month" integer NOT NULL,
    "drink" "text",
    "memo" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "monthly_drink_applications_month_check" CHECK ((("month" >= 1) AND ("month" <= 12)))
);


ALTER TABLE "public"."monthly_drink_applications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."monthly_drink_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "year" integer NOT NULL,
    "month" integer NOT NULL,
    "drink_options" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "pickup_persons" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "monthly_drink_settings_month_check" CHECK ((("month" >= 1) AND ("month" <= 12)))
);


ALTER TABLE "public"."monthly_drink_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organizations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."organizations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."push_notification_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "body" "text" NOT NULL,
    "tag" "text",
    "send_to_all" boolean DEFAULT false,
    "total_recipients" integer DEFAULT 0,
    "success_count" integer DEFAULT 0,
    "failed_count" integer DEFAULT 0,
    "cleaned_count" integer DEFAULT 0,
    "results" "jsonb",
    "sent_by" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."push_notification_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."push_subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "member_id" "uuid" NOT NULL,
    "endpoint" "text" NOT NULL,
    "p256dh" "text" NOT NULL,
    "auth" "text" NOT NULL,
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."push_subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."restaurants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "business_number" "text",
    "address" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."restaurants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."settlement_status" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "year" integer NOT NULL,
    "month" integer NOT NULL,
    "is_settled" boolean DEFAULT false,
    "settled_at" timestamp with time zone,
    "settled_by" "uuid",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "settlement_status_month_check" CHECK ((("month" >= 1) AND ("month" <= 12)))
);


ALTER TABLE "public"."settlement_status" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sync_queue" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "operation" "text" NOT NULL,
    "table_name" "text" NOT NULL,
    "record_id" "uuid" NOT NULL,
    "payload" "jsonb",
    "status" "text" DEFAULT 'pending'::"text",
    "error_message" "text",
    "retry_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "processed_at" timestamp with time zone,
    CONSTRAINT "sync_queue_operation_check" CHECK (("operation" = ANY (ARRAY['INSERT'::"text", 'UPDATE'::"text", 'DELETE'::"text"]))),
    CONSTRAINT "sync_queue_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'processing'::"text", 'completed'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."sync_queue" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."usage_record_audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "usage_record_id" "uuid" NOT NULL,
    "action" "text" NOT NULL,
    "changed_by" "uuid" NOT NULL,
    "changed_at" timestamp with time zone DEFAULT "now"(),
    "previous_data" "jsonb",
    "new_data" "jsonb"
);


ALTER TABLE "public"."usage_record_audit_logs" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."user_monthly_stats" AS
 WITH "monthly_data" AS (
         SELECT "m"."id" AS "user_id",
            "m"."full_name",
            "m"."login_id",
            "years"."year",
            "months"."month",
            ( SELECT "count"(*) AS "count"
                   FROM "generate_series"(("make_date"("years"."year", "months"."month", 1))::timestamp without time zone, (("make_date"("years"."year", "months"."month", 1) + '1 mon'::interval) - '1 day'::interval), '1 day'::interval) "d"("d")
                  WHERE (EXTRACT(dow FROM "d"."d") <> ALL (ARRAY[(0)::numeric, (6)::numeric]))) AS "weekday_count",
            ( SELECT "count"(*) AS "count"
                   FROM "public"."holidays" "h"
                  WHERE ((EXTRACT(year FROM "h"."holiday_date") = ("years"."year")::numeric) AND (EXTRACT(month FROM "h"."holiday_date") = ("months"."month")::numeric) AND (EXTRACT(dow FROM "h"."holiday_date") <> ALL (ARRAY[(0)::numeric, (6)::numeric])))) AS "public_holiday_count"
           FROM (("public"."members" "m"
             CROSS JOIN ( SELECT "generate_series"(2024, 2030) AS "year") "years")
             CROSS JOIN ( SELECT "generate_series"(1, 12) AS "month") "months")
        ), "meal_totals" AS (
         SELECT "ml"."user_id",
            (EXTRACT(year FROM "ml"."entry_date"))::integer AS "year",
            (EXTRACT(month FROM "ml"."entry_date"))::integer AS "month",
            "sum"(
                CASE
                    WHEN ("ml"."attendance" !~~* '%개별식사%'::"text") THEN "ml"."lunch_amount"
                    ELSE 0
                END) AS "total_used",
            "count"(*) FILTER (WHERE (((EXTRACT(dow FROM "ml"."entry_date") = ANY (ARRAY[(0)::numeric, (6)::numeric])) OR ("ml"."entry_date" IN ( SELECT "holidays"."holiday_date"
                   FROM "public"."holidays"))) AND ("ml"."total_amount" > 0))) AS "weekend_work_days",
            "count"(*) FILTER (WHERE ("ml"."attendance" ~~* '%개별식사%'::"text")) AS "individual_meals",
            "count"(*) FILTER (WHERE ("ml"."attendance" ~~* '%재택%'::"text")) AS "remote_work_days",
            "count"(*) FILTER (WHERE ("ml"."attendance" = '연차/휴무'::"text")) AS "annual_leave_days",
            "count"(*) FILTER (WHERE ("ml"."attendance" ~~* '%반차%'::"text")) AS "half_day_off_count",
            "count"(*) FILTER (WHERE ("ml"."attendance" = '휴무'::"text")) AS "day_off_days"
           FROM "public"."meal_logs" "ml"
          GROUP BY "ml"."user_id", (EXTRACT(year FROM "ml"."entry_date")), (EXTRACT(month FROM "ml"."entry_date"))
        ), "allowance_data" AS (
         SELECT "gs"."daily_allowance",
            "gs"."monthly_allowances"
           FROM "public"."global_settings" "gs"
          WHERE ("gs"."id" = 1)
        )
 SELECT "md"."user_id",
    "md"."full_name",
    "md"."login_id",
    "md"."year",
    "md"."month",
    ("md"."weekday_count" - "md"."public_holiday_count") AS "work_days",
    (COALESCE("mt"."annual_leave_days", (0)::bigint) + COALESCE("mt"."half_day_off_count", (0)::bigint)) AS "holiday_count",
    "md"."public_holiday_count",
    "ad"."daily_allowance",
    COALESCE((((("ad"."monthly_allowances" -> ("md"."year")::"text") -> ("md"."month")::"text") ->> 'allowance'::"text"))::bigint, (0)::bigint) AS "original_allowance",
    (COALESCE("mt"."individual_meals", (0)::bigint) * "ad"."daily_allowance") AS "individual_meal_deduction",
    (((COALESCE("mt"."annual_leave_days", (0)::bigint) + COALESCE("mt"."remote_work_days", (0)::bigint)) + COALESCE("mt"."day_off_days", (0)::bigint)) * "ad"."daily_allowance") AS "no_meal_deduction",
    (COALESCE("mt"."half_day_off_count", (0)::bigint) * "ad"."daily_allowance") AS "half_day_deduction",
    ("md"."public_holiday_count" * "ad"."daily_allowance") AS "holiday_deduction",
    ((((((COALESCE("mt"."individual_meals", (0)::bigint) + COALESCE("mt"."annual_leave_days", (0)::bigint)) + COALESCE("mt"."remote_work_days", (0)::bigint)) + COALESCE("mt"."day_off_days", (0)::bigint)) + COALESCE("mt"."half_day_off_count", (0)::bigint)) + "md"."public_holiday_count") * "ad"."daily_allowance") AS "total_deduction",
    ((COALESCE((((("ad"."monthly_allowances" -> ("md"."year")::"text") -> ("md"."month")::"text") ->> 'allowance'::"text"))::bigint, (0)::bigint) - ((((((COALESCE("mt"."individual_meals", (0)::bigint) + COALESCE("mt"."annual_leave_days", (0)::bigint)) + COALESCE("mt"."remote_work_days", (0)::bigint)) + COALESCE("mt"."day_off_days", (0)::bigint)) + COALESCE("mt"."half_day_off_count", (0)::bigint)) + "md"."public_holiday_count") * "ad"."daily_allowance")) + (COALESCE("mt"."weekend_work_days", (0)::bigint) * "ad"."daily_allowance")) AS "total_allowance",
    COALESCE("mt"."total_used", (0)::bigint) AS "total_used",
    (((COALESCE((((("ad"."monthly_allowances" -> ("md"."year")::"text") -> ("md"."month")::"text") ->> 'allowance'::"text"))::bigint, (0)::bigint) - ((((((COALESCE("mt"."individual_meals", (0)::bigint) + COALESCE("mt"."annual_leave_days", (0)::bigint)) + COALESCE("mt"."remote_work_days", (0)::bigint)) + COALESCE("mt"."day_off_days", (0)::bigint)) + COALESCE("mt"."half_day_off_count", (0)::bigint)) + "md"."public_holiday_count") * "ad"."daily_allowance")) + (COALESCE("mt"."weekend_work_days", (0)::bigint) * "ad"."daily_allowance")) - COALESCE("mt"."total_used", (0)::bigint)) AS "balance",
    COALESCE("mt"."weekend_work_days", (0)::bigint) AS "weekend_work_days",
    COALESCE("mt"."individual_meals", (0)::bigint) AS "individual_meals",
    COALESCE("mt"."remote_work_days", (0)::bigint) AS "remote_work_days",
    COALESCE("mt"."half_day_off_count", (0)::bigint) AS "half_day_off_count",
    COALESCE("mt"."annual_leave_days", (0)::bigint) AS "annual_leave_days",
    COALESCE("mt"."day_off_days", (0)::bigint) AS "day_off_days"
   FROM (("monthly_data" "md"
     CROSS JOIN "allowance_data" "ad")
     LEFT JOIN "meal_totals" "mt" ON ((("md"."user_id" = "mt"."user_id") AND ("md"."year" = "mt"."year") AND ("md"."month" = "mt"."month"))));


ALTER VIEW "public"."user_monthly_stats" OWNER TO "postgres";


ALTER TABLE ONLY "public"."budget_allocations"
    ADD CONSTRAINT "budget_allocations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."divisions"
    ADD CONSTRAINT "divisions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."global_settings"
    ADD CONSTRAINT "global_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."holidays"
    ADD CONSTRAINT "holidays_pkey" PRIMARY KEY ("holiday_date");



ALTER TABLE ONLY "public"."lunch_fixed_schedules"
    ADD CONSTRAINT "lunch_fixed_schedules_day_of_week_user_id_key" UNIQUE ("day_of_week", "user_id");



ALTER TABLE ONLY "public"."lunch_fixed_schedules"
    ADD CONSTRAINT "lunch_fixed_schedules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lunch_group_excluded_members"
    ADD CONSTRAINT "lunch_group_excluded_members_member_id_week_start_date_key" UNIQUE ("member_id", "week_start_date");



ALTER TABLE ONLY "public"."lunch_group_excluded_members"
    ADD CONSTRAINT "lunch_group_excluded_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lunch_group_members"
    ADD CONSTRAINT "lunch_group_members_group_id_user_id_key" UNIQUE ("group_id", "user_id");



ALTER TABLE ONLY "public"."lunch_group_members"
    ADD CONSTRAINT "lunch_group_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lunch_group_settings"
    ADD CONSTRAINT "lunch_group_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lunch_groups"
    ADD CONSTRAINT "lunch_groups_group_number_week_start_date_key" UNIQUE ("group_number", "week_start_date");



ALTER TABLE ONLY "public"."lunch_groups"
    ADD CONSTRAINT "lunch_groups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."meal_logs"
    ADD CONSTRAINT "meal_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."meal_logs"
    ADD CONSTRAINT "meal_logs_user_id_entry_date_key" UNIQUE ("user_id", "entry_date");



ALTER TABLE ONLY "public"."member_statuses"
    ADD CONSTRAINT "member_statuses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."members"
    ADD CONSTRAINT "members_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."members"
    ADD CONSTRAINT "members_login_id_key" UNIQUE ("login_id");



ALTER TABLE ONLY "public"."members"
    ADD CONSTRAINT "members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."monthly_allowances"
    ADD CONSTRAINT "monthly_allowances_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."monthly_allowances"
    ADD CONSTRAINT "monthly_allowances_user_id_year_month_key" UNIQUE ("user_id", "year", "month");



ALTER TABLE ONLY "public"."monthly_drink_applications"
    ADD CONSTRAINT "monthly_drink_applications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."monthly_drink_applications"
    ADD CONSTRAINT "monthly_drink_applications_user_id_year_month_key" UNIQUE ("user_id", "year", "month");



ALTER TABLE ONLY "public"."monthly_drink_settings"
    ADD CONSTRAINT "monthly_drink_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."monthly_drink_settings"
    ADD CONSTRAINT "monthly_drink_settings_year_month_key" UNIQUE ("year", "month");



ALTER TABLE ONLY "public"."member_statuses"
    ADD CONSTRAINT "no_overlapping_status" EXCLUDE USING "gist" ("member_id" WITH =, "daterange"("start_date", COALESCE("end_date", '9999-12-31'::"date"), '[]'::"text") WITH &&);



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."push_notification_logs"
    ADD CONSTRAINT "push_notification_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_member_id_endpoint_key" UNIQUE ("member_id", "endpoint");



ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."restaurants"
    ADD CONSTRAINT "restaurants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."settlement_status"
    ADD CONSTRAINT "settlement_status_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."settlement_status"
    ADD CONSTRAINT "settlement_status_user_id_year_month_key" UNIQUE ("user_id", "year", "month");



ALTER TABLE ONLY "public"."sync_queue"
    ADD CONSTRAINT "sync_queue_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."usage_record_audit_logs"
    ADD CONSTRAINT "usage_record_audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."usage_records"
    ADD CONSTRAINT "usage_records_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_budget_member" ON "public"."budget_allocations" USING "btree" ("member_id");



CREATE INDEX "idx_budget_type_period" ON "public"."budget_allocations" USING "btree" ("type", "period");



CREATE INDEX "idx_holidays_month" ON "public"."holidays" USING "btree" (EXTRACT(year FROM "holiday_date"), EXTRACT(month FROM "holiday_date"));



CREATE INDEX "idx_lunch_excluded_week" ON "public"."lunch_group_excluded_members" USING "btree" ("week_start_date");



CREATE INDEX "idx_lunch_fixed_schedules_day" ON "public"."lunch_fixed_schedules" USING "btree" ("day_of_week");



CREATE INDEX "idx_lunch_fixed_schedules_user_id" ON "public"."lunch_fixed_schedules" USING "btree" ("user_id");



CREATE INDEX "idx_lunch_group_members_group" ON "public"."lunch_group_members" USING "btree" ("group_id");



CREATE INDEX "idx_lunch_group_members_user" ON "public"."lunch_group_members" USING "btree" ("user_id");



CREATE INDEX "idx_lunch_groups_week" ON "public"."lunch_groups" USING "btree" ("week_start_date");



CREATE INDEX "idx_meal_logs_entry_date" ON "public"."meal_logs" USING "btree" ("entry_date");



CREATE INDEX "idx_meal_logs_user_month" ON "public"."meal_logs" USING "btree" ("user_id", EXTRACT(year FROM "entry_date"), EXTRACT(month FROM "entry_date"));



CREATE INDEX "idx_member_statuses_dates" ON "public"."member_statuses" USING "btree" ("start_date", "end_date");



CREATE INDEX "idx_member_statuses_member_id" ON "public"."member_statuses" USING "btree" ("member_id");



CREATE INDEX "idx_members_full_name" ON "public"."members" USING "btree" ("full_name");



CREATE INDEX "idx_members_login_id" ON "public"."members" USING "btree" ("login_id");



CREATE INDEX "idx_members_org" ON "public"."members" USING "btree" ("organization_id");



CREATE INDEX "idx_members_team" ON "public"."members" USING "btree" ("team_id");



CREATE INDEX "idx_monthly_allowances_user_year_month" ON "public"."monthly_allowances" USING "btree" ("user_id", "year", "month");



CREATE INDEX "idx_monthly_drink_applications_year_month" ON "public"."monthly_drink_applications" USING "btree" ("year", "month");



CREATE INDEX "idx_monthly_drink_settings_year_month" ON "public"."monthly_drink_settings" USING "btree" ("year", "month");



CREATE INDEX "idx_push_subscriptions_member_id" ON "public"."push_subscriptions" USING "btree" ("member_id");



CREATE INDEX "idx_restaurants_created_by" ON "public"."restaurants" USING "btree" ("created_by");



CREATE INDEX "idx_restaurants_name" ON "public"."restaurants" USING "btree" ("name");



CREATE UNIQUE INDEX "idx_restaurants_unique_name_business" ON "public"."restaurants" USING "btree" ("lower"("name"), COALESCE("business_number", ''::"text"));



CREATE INDEX "idx_settlement_status_month" ON "public"."settlement_status" USING "btree" ("year", "month");



CREATE INDEX "idx_settlement_status_settled_by" ON "public"."settlement_status" USING "btree" ("settled_by");



CREATE INDEX "idx_settlement_status_user_month" ON "public"."settlement_status" USING "btree" ("user_id", "year", "month");



CREATE INDEX "idx_sync_queue_created_at" ON "public"."sync_queue" USING "btree" ("created_at");



CREATE INDEX "idx_sync_queue_status" ON "public"."sync_queue" USING "btree" ("status");



CREATE INDEX "idx_usage_allocation" ON "public"."usage_records" USING "btree" ("allocation_id");



CREATE INDEX "idx_usage_member" ON "public"."usage_records" USING "btree" ("member_id");



CREATE INDEX "idx_usage_records_no" ON "public"."usage_records" USING "btree" ("no" DESC NULLS LAST);



CREATE INDEX "idx_usage_records_review_status" ON "public"."usage_records" USING "btree" ("review_status");



CREATE INDEX "idx_usage_reviewed" ON "public"."usage_records" USING "btree" ("is_reviewed");



CREATE INDEX "idx_usage_type" ON "public"."usage_records" USING "btree" ("type");



CREATE INDEX "idx_usage_used_at" ON "public"."usage_records" USING "btree" ("used_at");



CREATE OR REPLACE TRIGGER "meal_logs_sync_trigger" AFTER INSERT OR DELETE OR UPDATE ON "public"."meal_logs" FOR EACH ROW EXECUTE FUNCTION "public"."sync_meal_log_changes"();



CREATE OR REPLACE TRIGGER "set_member_statuses_updated_at" BEFORE UPDATE ON "public"."member_statuses" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trg_audit_usage_delete" BEFORE DELETE ON "public"."usage_records" FOR EACH ROW EXECUTE FUNCTION "public"."log_reviewed_record_change"();



CREATE OR REPLACE TRIGGER "trg_audit_usage_update" BEFORE UPDATE ON "public"."usage_records" FOR EACH ROW EXECUTE FUNCTION "public"."log_reviewed_record_change"();



CREATE OR REPLACE TRIGGER "trg_auto_assign_no" BEFORE INSERT ON "public"."usage_records" FOR EACH ROW EXECUTE FUNCTION "public"."auto_assign_usage_record_no"();



CREATE OR REPLACE TRIGGER "trg_budget_updated" BEFORE UPDATE ON "public"."budget_allocations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_divisions_updated" BEFORE UPDATE ON "public"."divisions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_organizations_updated" BEFORE UPDATE ON "public"."organizations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_sync_is_reviewed" BEFORE INSERT OR UPDATE ON "public"."usage_records" FOR EACH ROW EXECUTE FUNCTION "public"."sync_is_reviewed"();



CREATE OR REPLACE TRIGGER "trg_teams_updated" BEFORE UPDATE ON "public"."teams" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_usage_updated" BEFORE UPDATE ON "public"."usage_records" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "update_global_settings_updated_at" BEFORE UPDATE ON "public"."global_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_meal_logs_updated_at" BEFORE UPDATE ON "public"."meal_logs" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_members_updated_at" BEFORE UPDATE ON "public"."members" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_monthly_allowances_updated_at" BEFORE UPDATE ON "public"."monthly_allowances" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_restaurants_updated_at" BEFORE UPDATE ON "public"."restaurants" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_settlement_status_updated_at" BEFORE UPDATE ON "public"."settlement_status" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."budget_allocations"
    ADD CONSTRAINT "budget_allocations_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."divisions"
    ADD CONSTRAINT "divisions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lunch_fixed_schedules"
    ADD CONSTRAINT "lunch_fixed_schedules_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."members"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lunch_group_excluded_members"
    ADD CONSTRAINT "lunch_group_excluded_members_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lunch_group_members"
    ADD CONSTRAINT "lunch_group_members_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."lunch_groups"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lunch_group_members"
    ADD CONSTRAINT "lunch_group_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."members"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."meal_logs"
    ADD CONSTRAINT "meal_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."members"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."member_statuses"
    ADD CONSTRAINT "member_statuses_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."members"
    ADD CONSTRAINT "members_division_id_fkey" FOREIGN KEY ("division_id") REFERENCES "public"."divisions"("id");



ALTER TABLE ONLY "public"."members"
    ADD CONSTRAINT "members_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."members"
    ADD CONSTRAINT "members_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id");



ALTER TABLE ONLY "public"."monthly_allowances"
    ADD CONSTRAINT "monthly_allowances_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."members"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."monthly_drink_applications"
    ADD CONSTRAINT "monthly_drink_applications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."members"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."restaurants"
    ADD CONSTRAINT "restaurants_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."members"("id");



ALTER TABLE ONLY "public"."settlement_status"
    ADD CONSTRAINT "settlement_status_settled_by_fkey" FOREIGN KEY ("settled_by") REFERENCES "public"."members"("id");



ALTER TABLE ONLY "public"."settlement_status"
    ADD CONSTRAINT "settlement_status_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."members"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_division_id_fkey" FOREIGN KEY ("division_id") REFERENCES "public"."divisions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."usage_record_audit_logs"
    ADD CONSTRAINT "usage_record_audit_logs_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "public"."members"("id");



ALTER TABLE ONLY "public"."usage_record_audit_logs"
    ADD CONSTRAINT "usage_record_audit_logs_usage_record_id_fkey" FOREIGN KEY ("usage_record_id") REFERENCES "public"."usage_records"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."usage_records"
    ADD CONSTRAINT "usage_records_allocation_id_fkey" FOREIGN KEY ("allocation_id") REFERENCES "public"."budget_allocations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."usage_records"
    ADD CONSTRAINT "usage_records_first_reviewed_by_fkey" FOREIGN KEY ("first_reviewed_by") REFERENCES "public"."members"("id");



ALTER TABLE ONLY "public"."usage_records"
    ADD CONSTRAINT "usage_records_last_modified_by_fkey" FOREIGN KEY ("last_modified_by") REFERENCES "public"."members"("id");



ALTER TABLE ONLY "public"."usage_records"
    ADD CONSTRAINT "usage_records_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."usage_records"
    ADD CONSTRAINT "usage_records_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "public"."members"("id");



ALTER TABLE ONLY "public"."usage_records"
    ADD CONSTRAINT "usage_records_second_reviewed_by_fkey" FOREIGN KEY ("second_reviewed_by") REFERENCES "public"."members"("id");



CREATE POLICY "Admins can delete holidays" ON "public"."holidays" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."members"
  WHERE ((("members"."id")::"text" = (( SELECT "auth"."uid"() AS "uid"))::"text") AND ("members"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can delete monthly allowances" ON "public"."monthly_allowances" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."members"
  WHERE ((("members"."id")::"text" = (( SELECT "auth"."uid"() AS "uid"))::"text") AND ("members"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can delete restaurants" ON "public"."restaurants" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."members"
  WHERE ((("members"."id")::"text" = (( SELECT "auth"."uid"() AS "uid"))::"text") AND ("members"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can delete settlement status" ON "public"."settlement_status" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."members"
  WHERE ((("members"."id")::"text" = (( SELECT "auth"."uid"() AS "uid"))::"text") AND ("members"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can insert holidays" ON "public"."holidays" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."members"
  WHERE ((("members"."id")::"text" = (( SELECT "auth"."uid"() AS "uid"))::"text") AND ("members"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can insert monthly allowances" ON "public"."monthly_allowances" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."members"
  WHERE ((("members"."id")::"text" = (( SELECT "auth"."uid"() AS "uid"))::"text") AND ("members"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can insert settlement status" ON "public"."settlement_status" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."members"
  WHERE ((("members"."id")::"text" = (( SELECT "auth"."uid"() AS "uid"))::"text") AND ("members"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can manage sync queue" ON "public"."sync_queue" USING ((EXISTS ( SELECT 1
   FROM "public"."members"
  WHERE ((("members"."id")::"text" = (( SELECT "auth"."uid"() AS "uid"))::"text") AND ("members"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can update holidays" ON "public"."holidays" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."members"
  WHERE ((("members"."id")::"text" = (( SELECT "auth"."uid"() AS "uid"))::"text") AND ("members"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can update monthly allowances" ON "public"."monthly_allowances" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."members"
  WHERE ((("members"."id")::"text" = (( SELECT "auth"."uid"() AS "uid"))::"text") AND ("members"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can update restaurants" ON "public"."restaurants" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."members"
  WHERE ((("members"."id")::"text" = (( SELECT "auth"."uid"() AS "uid"))::"text") AND ("members"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can update settings" ON "public"."global_settings" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."members"
  WHERE ((("members"."id")::"text" = (( SELECT "auth"."uid"() AS "uid"))::"text") AND ("members"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can update settlement status" ON "public"."settlement_status" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."members"
  WHERE ((("members"."id")::"text" = (( SELECT "auth"."uid"() AS "uid"))::"text") AND ("members"."role" = 'admin'::"text")))));



CREATE POLICY "Allow all for authenticated" ON "public"."lunch_fixed_schedules" USING (true);



CREATE POLICY "Allow all for authenticated" ON "public"."lunch_group_members" USING (true);



CREATE POLICY "Allow all for authenticated" ON "public"."lunch_group_settings" USING (true);



CREATE POLICY "Allow all for authenticated" ON "public"."lunch_groups" USING (true);



CREATE POLICY "Allow all for service role" ON "public"."monthly_drink_applications" TO "service_role" USING (true);



CREATE POLICY "Allow all for service role" ON "public"."monthly_drink_settings" TO "service_role" USING (true);



CREATE POLICY "Allow insert for authenticated" ON "public"."monthly_drink_applications" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Allow read for all" ON "public"."members" FOR SELECT USING (true);



CREATE POLICY "Allow read for authenticated" ON "public"."monthly_drink_applications" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow read for authenticated" ON "public"."monthly_drink_settings" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow update own" ON "public"."monthly_drink_applications" FOR UPDATE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Anyone can view holidays" ON "public"."holidays" FOR SELECT USING (true);



CREATE POLICY "Anyone can view monthly allowances" ON "public"."monthly_allowances" FOR SELECT USING (true);



CREATE POLICY "Anyone can view restaurants" ON "public"."restaurants" FOR SELECT USING (true);



CREATE POLICY "Anyone can view settings" ON "public"."global_settings" FOR SELECT USING (true);



CREATE POLICY "Anyone can view settlement status" ON "public"."settlement_status" FOR SELECT USING (true);



CREATE POLICY "Authenticated users can insert restaurants" ON "public"."restaurants" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Deny direct access" ON "public"."push_notification_logs" USING (false);



CREATE POLICY "Service role bypass" ON "public"."members" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role bypass monthly allowances" ON "public"."monthly_allowances" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role bypass restaurants" ON "public"."restaurants" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role bypass settlement" ON "public"."settlement_status" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Users can delete own meal logs" ON "public"."meal_logs" FOR DELETE USING (((("user_id")::"text" = (( SELECT "auth"."uid"() AS "uid"))::"text") OR (EXISTS ( SELECT 1
   FROM "public"."members"
  WHERE ((("members"."id")::"text" = (( SELECT "auth"."uid"() AS "uid"))::"text") AND ("members"."role" = 'admin'::"text"))))));



CREATE POLICY "Users can insert own meal logs" ON "public"."meal_logs" FOR INSERT WITH CHECK (((("user_id")::"text" = (( SELECT "auth"."uid"() AS "uid"))::"text") OR (EXISTS ( SELECT 1
   FROM "public"."members"
  WHERE ((("members"."id")::"text" = (( SELECT "auth"."uid"() AS "uid"))::"text") AND ("members"."role" = 'admin'::"text"))))));



CREATE POLICY "Users can update own meal logs" ON "public"."meal_logs" FOR UPDATE USING (((("user_id")::"text" = (( SELECT "auth"."uid"() AS "uid"))::"text") OR (EXISTS ( SELECT 1
   FROM "public"."members"
  WHERE ((("members"."id")::"text" = (( SELECT "auth"."uid"() AS "uid"))::"text") AND ("members"."role" = 'admin'::"text"))))));



CREATE POLICY "Users can view own meal logs" ON "public"."meal_logs" FOR SELECT USING (((("user_id")::"text" = (( SELECT "auth"."uid"() AS "uid"))::"text") OR (EXISTS ( SELECT 1
   FROM "public"."members"
  WHERE ((("members"."id")::"text" = (( SELECT "auth"."uid"() AS "uid"))::"text") AND ("members"."role" = 'admin'::"text"))))));



ALTER TABLE "public"."budget_allocations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."divisions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."global_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."holidays" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lunch_fixed_schedules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lunch_group_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lunch_group_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lunch_groups" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."meal_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."monthly_allowances" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."monthly_drink_applications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."monthly_drink_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organizations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."push_notification_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."push_subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."restaurants" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "service_role_all_audit_logs" ON "public"."usage_record_audit_logs" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_all_budget_allocations" ON "public"."budget_allocations" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_all_divisions" ON "public"."divisions" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_all_organizations" ON "public"."organizations" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_all_teams" ON "public"."teams" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_all_usage_records" ON "public"."usage_records" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."settlement_status" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sync_queue" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."teams" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."usage_record_audit_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."usage_records" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."gbtreekey16_in"("cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbtreekey16_in"("cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."gbtreekey16_in"("cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbtreekey16_in"("cstring") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbtreekey16_out"("public"."gbtreekey16") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbtreekey16_out"("public"."gbtreekey16") TO "anon";
GRANT ALL ON FUNCTION "public"."gbtreekey16_out"("public"."gbtreekey16") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbtreekey16_out"("public"."gbtreekey16") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbtreekey2_in"("cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbtreekey2_in"("cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."gbtreekey2_in"("cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbtreekey2_in"("cstring") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbtreekey2_out"("public"."gbtreekey2") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbtreekey2_out"("public"."gbtreekey2") TO "anon";
GRANT ALL ON FUNCTION "public"."gbtreekey2_out"("public"."gbtreekey2") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbtreekey2_out"("public"."gbtreekey2") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbtreekey32_in"("cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbtreekey32_in"("cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."gbtreekey32_in"("cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbtreekey32_in"("cstring") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbtreekey32_out"("public"."gbtreekey32") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbtreekey32_out"("public"."gbtreekey32") TO "anon";
GRANT ALL ON FUNCTION "public"."gbtreekey32_out"("public"."gbtreekey32") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbtreekey32_out"("public"."gbtreekey32") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbtreekey4_in"("cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbtreekey4_in"("cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."gbtreekey4_in"("cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbtreekey4_in"("cstring") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbtreekey4_out"("public"."gbtreekey4") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbtreekey4_out"("public"."gbtreekey4") TO "anon";
GRANT ALL ON FUNCTION "public"."gbtreekey4_out"("public"."gbtreekey4") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbtreekey4_out"("public"."gbtreekey4") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbtreekey8_in"("cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbtreekey8_in"("cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."gbtreekey8_in"("cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbtreekey8_in"("cstring") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbtreekey8_out"("public"."gbtreekey8") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbtreekey8_out"("public"."gbtreekey8") TO "anon";
GRANT ALL ON FUNCTION "public"."gbtreekey8_out"("public"."gbtreekey8") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbtreekey8_out"("public"."gbtreekey8") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbtreekey_var_in"("cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbtreekey_var_in"("cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."gbtreekey_var_in"("cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbtreekey_var_in"("cstring") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbtreekey_var_out"("public"."gbtreekey_var") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbtreekey_var_out"("public"."gbtreekey_var") TO "anon";
GRANT ALL ON FUNCTION "public"."gbtreekey_var_out"("public"."gbtreekey_var") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbtreekey_var_out"("public"."gbtreekey_var") TO "service_role";

























































































































































GRANT ALL ON TABLE "public"."usage_records" TO "anon";
GRANT ALL ON TABLE "public"."usage_records" TO "authenticated";
GRANT ALL ON TABLE "public"."usage_records" TO "service_role";



GRANT ALL ON FUNCTION "public"."advance_review_status"("p_usage_record_id" "uuid", "p_reviewer_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."advance_review_status"("p_usage_record_id" "uuid", "p_reviewer_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."advance_review_status"("p_usage_record_id" "uuid", "p_reviewer_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."authenticate_user"("p_login_id" "text", "p_password" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."authenticate_user"("p_login_id" "text", "p_password" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."authenticate_user"("p_login_id" "text", "p_password" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."auto_assign_usage_record_no"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_assign_usage_record_no"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_assign_usage_record_no"() TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_activity_budget"("p_member_id" "uuid", "p_base_amount" integer, "p_per_member_amount" integer, "p_additional_count" integer, "p_additional_per_amount" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_activity_budget"("p_member_id" "uuid", "p_base_amount" integer, "p_per_member_amount" integer, "p_additional_count" integer, "p_additional_per_amount" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_activity_budget"("p_member_id" "uuid", "p_base_amount" integer, "p_per_member_amount" integer, "p_additional_count" integer, "p_additional_per_amount" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."cash_dist"("money", "money") TO "postgres";
GRANT ALL ON FUNCTION "public"."cash_dist"("money", "money") TO "anon";
GRANT ALL ON FUNCTION "public"."cash_dist"("money", "money") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cash_dist"("money", "money") TO "service_role";



GRANT ALL ON FUNCTION "public"."date_dist"("date", "date") TO "postgres";
GRANT ALL ON FUNCTION "public"."date_dist"("date", "date") TO "anon";
GRANT ALL ON FUNCTION "public"."date_dist"("date", "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."date_dist"("date", "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."float4_dist"(real, real) TO "postgres";
GRANT ALL ON FUNCTION "public"."float4_dist"(real, real) TO "anon";
GRANT ALL ON FUNCTION "public"."float4_dist"(real, real) TO "authenticated";
GRANT ALL ON FUNCTION "public"."float4_dist"(real, real) TO "service_role";



GRANT ALL ON FUNCTION "public"."float8_dist"(double precision, double precision) TO "postgres";
GRANT ALL ON FUNCTION "public"."float8_dist"(double precision, double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."float8_dist"(double precision, double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."float8_dist"(double precision, double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bit_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bit_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bit_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bit_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bit_consistent"("internal", bit, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bit_consistent"("internal", bit, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bit_consistent"("internal", bit, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bit_consistent"("internal", bit, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bit_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bit_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bit_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bit_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bit_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bit_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bit_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bit_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bit_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bit_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bit_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bit_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bit_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bit_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bit_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bit_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bool_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bool_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bool_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bool_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bool_consistent"("internal", boolean, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bool_consistent"("internal", boolean, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bool_consistent"("internal", boolean, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bool_consistent"("internal", boolean, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bool_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bool_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bool_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bool_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bool_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bool_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bool_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bool_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bool_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bool_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bool_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bool_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bool_same"("public"."gbtreekey2", "public"."gbtreekey2", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bool_same"("public"."gbtreekey2", "public"."gbtreekey2", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bool_same"("public"."gbtreekey2", "public"."gbtreekey2", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bool_same"("public"."gbtreekey2", "public"."gbtreekey2", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bool_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bool_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bool_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bool_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bpchar_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bpchar_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bpchar_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bpchar_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bpchar_consistent"("internal", character, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bpchar_consistent"("internal", character, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bpchar_consistent"("internal", character, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bpchar_consistent"("internal", character, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bytea_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bytea_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bytea_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bytea_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bytea_consistent"("internal", "bytea", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bytea_consistent"("internal", "bytea", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bytea_consistent"("internal", "bytea", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bytea_consistent"("internal", "bytea", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bytea_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bytea_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bytea_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bytea_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bytea_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bytea_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bytea_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bytea_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bytea_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bytea_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bytea_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bytea_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bytea_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bytea_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bytea_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bytea_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_cash_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_cash_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_cash_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_cash_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_cash_consistent"("internal", "money", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_cash_consistent"("internal", "money", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_cash_consistent"("internal", "money", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_cash_consistent"("internal", "money", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_cash_distance"("internal", "money", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_cash_distance"("internal", "money", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_cash_distance"("internal", "money", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_cash_distance"("internal", "money", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_cash_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_cash_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_cash_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_cash_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_cash_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_cash_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_cash_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_cash_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_cash_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_cash_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_cash_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_cash_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_cash_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_cash_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_cash_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_cash_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_cash_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_cash_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_cash_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_cash_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_date_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_date_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_date_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_date_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_date_consistent"("internal", "date", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_date_consistent"("internal", "date", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_date_consistent"("internal", "date", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_date_consistent"("internal", "date", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_date_distance"("internal", "date", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_date_distance"("internal", "date", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_date_distance"("internal", "date", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_date_distance"("internal", "date", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_date_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_date_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_date_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_date_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_date_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_date_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_date_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_date_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_date_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_date_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_date_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_date_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_date_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_date_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_date_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_date_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_date_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_date_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_date_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_date_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_decompress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_decompress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_decompress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_decompress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_enum_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_enum_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_enum_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_enum_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_enum_consistent"("internal", "anyenum", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_enum_consistent"("internal", "anyenum", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_enum_consistent"("internal", "anyenum", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_enum_consistent"("internal", "anyenum", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_enum_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_enum_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_enum_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_enum_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_enum_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_enum_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_enum_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_enum_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_enum_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_enum_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_enum_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_enum_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_enum_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_enum_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_enum_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_enum_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_enum_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_enum_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_enum_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_enum_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float4_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float4_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float4_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float4_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float4_consistent"("internal", real, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float4_consistent"("internal", real, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float4_consistent"("internal", real, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float4_consistent"("internal", real, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float4_distance"("internal", real, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float4_distance"("internal", real, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float4_distance"("internal", real, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float4_distance"("internal", real, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float4_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float4_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float4_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float4_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float4_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float4_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float4_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float4_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float4_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float4_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float4_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float4_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float4_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float4_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float4_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float4_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float4_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float4_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float4_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float4_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float8_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float8_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float8_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float8_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float8_consistent"("internal", double precision, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float8_consistent"("internal", double precision, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float8_consistent"("internal", double precision, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float8_consistent"("internal", double precision, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float8_distance"("internal", double precision, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float8_distance"("internal", double precision, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float8_distance"("internal", double precision, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float8_distance"("internal", double precision, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float8_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float8_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float8_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float8_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float8_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float8_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float8_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float8_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float8_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float8_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float8_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float8_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float8_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float8_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float8_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float8_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float8_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float8_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float8_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float8_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_inet_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_inet_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_inet_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_inet_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_inet_consistent"("internal", "inet", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_inet_consistent"("internal", "inet", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_inet_consistent"("internal", "inet", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_inet_consistent"("internal", "inet", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_inet_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_inet_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_inet_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_inet_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_inet_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_inet_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_inet_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_inet_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_inet_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_inet_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_inet_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_inet_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_inet_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_inet_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_inet_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_inet_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int2_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int2_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int2_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int2_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int2_consistent"("internal", smallint, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int2_consistent"("internal", smallint, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int2_consistent"("internal", smallint, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int2_consistent"("internal", smallint, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int2_distance"("internal", smallint, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int2_distance"("internal", smallint, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int2_distance"("internal", smallint, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int2_distance"("internal", smallint, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int2_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int2_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int2_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int2_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int2_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int2_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int2_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int2_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int2_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int2_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int2_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int2_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int2_same"("public"."gbtreekey4", "public"."gbtreekey4", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int2_same"("public"."gbtreekey4", "public"."gbtreekey4", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int2_same"("public"."gbtreekey4", "public"."gbtreekey4", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int2_same"("public"."gbtreekey4", "public"."gbtreekey4", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int2_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int2_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int2_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int2_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int4_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int4_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int4_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int4_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int4_consistent"("internal", integer, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int4_consistent"("internal", integer, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int4_consistent"("internal", integer, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int4_consistent"("internal", integer, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int4_distance"("internal", integer, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int4_distance"("internal", integer, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int4_distance"("internal", integer, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int4_distance"("internal", integer, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int4_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int4_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int4_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int4_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int4_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int4_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int4_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int4_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int4_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int4_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int4_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int4_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int4_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int4_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int4_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int4_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int4_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int4_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int4_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int4_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int8_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int8_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int8_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int8_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int8_consistent"("internal", bigint, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int8_consistent"("internal", bigint, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int8_consistent"("internal", bigint, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int8_consistent"("internal", bigint, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int8_distance"("internal", bigint, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int8_distance"("internal", bigint, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int8_distance"("internal", bigint, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int8_distance"("internal", bigint, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int8_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int8_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int8_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int8_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int8_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int8_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int8_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int8_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int8_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int8_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int8_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int8_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int8_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int8_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int8_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int8_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int8_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int8_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int8_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int8_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_intv_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_intv_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_intv_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_intv_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_intv_consistent"("internal", interval, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_intv_consistent"("internal", interval, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_intv_consistent"("internal", interval, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_intv_consistent"("internal", interval, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_intv_decompress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_intv_decompress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_intv_decompress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_intv_decompress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_intv_distance"("internal", interval, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_intv_distance"("internal", interval, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_intv_distance"("internal", interval, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_intv_distance"("internal", interval, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_intv_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_intv_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_intv_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_intv_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_intv_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_intv_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_intv_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_intv_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_intv_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_intv_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_intv_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_intv_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_intv_same"("public"."gbtreekey32", "public"."gbtreekey32", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_intv_same"("public"."gbtreekey32", "public"."gbtreekey32", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_intv_same"("public"."gbtreekey32", "public"."gbtreekey32", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_intv_same"("public"."gbtreekey32", "public"."gbtreekey32", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_intv_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_intv_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_intv_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_intv_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_macad8_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad8_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad8_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad8_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_macad8_consistent"("internal", "macaddr8", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad8_consistent"("internal", "macaddr8", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad8_consistent"("internal", "macaddr8", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad8_consistent"("internal", "macaddr8", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_macad8_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad8_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad8_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad8_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_macad8_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad8_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad8_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad8_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_macad8_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad8_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad8_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad8_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_macad8_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad8_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad8_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad8_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_macad8_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad8_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad8_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad8_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_macad_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_macad_consistent"("internal", "macaddr", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad_consistent"("internal", "macaddr", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad_consistent"("internal", "macaddr", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad_consistent"("internal", "macaddr", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_macad_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_macad_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_macad_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_macad_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_macad_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_numeric_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_numeric_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_numeric_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_numeric_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_numeric_consistent"("internal", numeric, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_numeric_consistent"("internal", numeric, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_numeric_consistent"("internal", numeric, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_numeric_consistent"("internal", numeric, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_numeric_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_numeric_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_numeric_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_numeric_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_numeric_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_numeric_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_numeric_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_numeric_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_numeric_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_numeric_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_numeric_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_numeric_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_numeric_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_numeric_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_numeric_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_numeric_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_oid_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_oid_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_oid_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_oid_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_oid_consistent"("internal", "oid", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_oid_consistent"("internal", "oid", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_oid_consistent"("internal", "oid", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_oid_consistent"("internal", "oid", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_oid_distance"("internal", "oid", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_oid_distance"("internal", "oid", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_oid_distance"("internal", "oid", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_oid_distance"("internal", "oid", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_oid_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_oid_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_oid_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_oid_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_oid_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_oid_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_oid_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_oid_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_oid_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_oid_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_oid_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_oid_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_oid_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_oid_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_oid_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_oid_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_oid_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_oid_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_oid_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_oid_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_text_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_text_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_text_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_text_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_text_consistent"("internal", "text", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_text_consistent"("internal", "text", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_text_consistent"("internal", "text", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_text_consistent"("internal", "text", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_text_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_text_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_text_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_text_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_text_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_text_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_text_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_text_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_text_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_text_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_text_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_text_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_text_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_text_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_text_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_text_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_time_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_time_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_time_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_time_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_time_consistent"("internal", time without time zone, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_time_consistent"("internal", time without time zone, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_time_consistent"("internal", time without time zone, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_time_consistent"("internal", time without time zone, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_time_distance"("internal", time without time zone, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_time_distance"("internal", time without time zone, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_time_distance"("internal", time without time zone, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_time_distance"("internal", time without time zone, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_time_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_time_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_time_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_time_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_time_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_time_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_time_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_time_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_time_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_time_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_time_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_time_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_time_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_time_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_time_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_time_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_time_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_time_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_time_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_time_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_timetz_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_timetz_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_timetz_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_timetz_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_timetz_consistent"("internal", time with time zone, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_timetz_consistent"("internal", time with time zone, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_timetz_consistent"("internal", time with time zone, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_timetz_consistent"("internal", time with time zone, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_ts_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_ts_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_ts_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_ts_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_ts_consistent"("internal", timestamp without time zone, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_ts_consistent"("internal", timestamp without time zone, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_ts_consistent"("internal", timestamp without time zone, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_ts_consistent"("internal", timestamp without time zone, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_ts_distance"("internal", timestamp without time zone, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_ts_distance"("internal", timestamp without time zone, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_ts_distance"("internal", timestamp without time zone, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_ts_distance"("internal", timestamp without time zone, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_ts_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_ts_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_ts_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_ts_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_ts_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_ts_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_ts_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_ts_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_ts_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_ts_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_ts_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_ts_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_ts_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_ts_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_ts_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_ts_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_ts_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_ts_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_ts_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_ts_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_tstz_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_tstz_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_tstz_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_tstz_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_tstz_consistent"("internal", timestamp with time zone, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_tstz_consistent"("internal", timestamp with time zone, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_tstz_consistent"("internal", timestamp with time zone, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_tstz_consistent"("internal", timestamp with time zone, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_tstz_distance"("internal", timestamp with time zone, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_tstz_distance"("internal", timestamp with time zone, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_tstz_distance"("internal", timestamp with time zone, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_tstz_distance"("internal", timestamp with time zone, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_uuid_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_uuid_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_uuid_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_uuid_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_uuid_consistent"("internal", "uuid", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_uuid_consistent"("internal", "uuid", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_uuid_consistent"("internal", "uuid", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_uuid_consistent"("internal", "uuid", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_uuid_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_uuid_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_uuid_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_uuid_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_uuid_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_uuid_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_uuid_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_uuid_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_uuid_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_uuid_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_uuid_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_uuid_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_uuid_same"("public"."gbtreekey32", "public"."gbtreekey32", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_uuid_same"("public"."gbtreekey32", "public"."gbtreekey32", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_uuid_same"("public"."gbtreekey32", "public"."gbtreekey32", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_uuid_same"("public"."gbtreekey32", "public"."gbtreekey32", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_uuid_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_uuid_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_uuid_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_uuid_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_var_decompress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_var_decompress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_var_decompress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_var_decompress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_var_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_var_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_var_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_var_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_popular_restaurants"("limit_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_popular_restaurants"("limit_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_popular_restaurants"("limit_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_monthly_stats"("p_year" integer, "p_month" integer, "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_monthly_stats"("p_year" integer, "p_month" integer, "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_monthly_stats"("p_year" integer, "p_month" integer, "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."int2_dist"(smallint, smallint) TO "postgres";
GRANT ALL ON FUNCTION "public"."int2_dist"(smallint, smallint) TO "anon";
GRANT ALL ON FUNCTION "public"."int2_dist"(smallint, smallint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."int2_dist"(smallint, smallint) TO "service_role";



GRANT ALL ON FUNCTION "public"."int4_dist"(integer, integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."int4_dist"(integer, integer) TO "anon";
GRANT ALL ON FUNCTION "public"."int4_dist"(integer, integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."int4_dist"(integer, integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."int8_dist"(bigint, bigint) TO "postgres";
GRANT ALL ON FUNCTION "public"."int8_dist"(bigint, bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."int8_dist"(bigint, bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."int8_dist"(bigint, bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."interval_dist"(interval, interval) TO "postgres";
GRANT ALL ON FUNCTION "public"."interval_dist"(interval, interval) TO "anon";
GRANT ALL ON FUNCTION "public"."interval_dist"(interval, interval) TO "authenticated";
GRANT ALL ON FUNCTION "public"."interval_dist"(interval, interval) TO "service_role";



GRANT ALL ON FUNCTION "public"."log_reviewed_record_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_reviewed_record_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_reviewed_record_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."normalize_restaurant_name"("name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."normalize_restaurant_name"("name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."normalize_restaurant_name"("name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."oid_dist"("oid", "oid") TO "postgres";
GRANT ALL ON FUNCTION "public"."oid_dist"("oid", "oid") TO "anon";
GRANT ALL ON FUNCTION "public"."oid_dist"("oid", "oid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."oid_dist"("oid", "oid") TO "service_role";



GRANT ALL ON FUNCTION "public"."revert_review_status"("p_usage_record_id" "uuid", "p_reviewer_id" "uuid", "p_target_status" smallint) TO "anon";
GRANT ALL ON FUNCTION "public"."revert_review_status"("p_usage_record_id" "uuid", "p_reviewer_id" "uuid", "p_target_status" smallint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."revert_review_status"("p_usage_record_id" "uuid", "p_reviewer_id" "uuid", "p_target_status" smallint) TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_is_reviewed"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_is_reviewed"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_is_reviewed"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_meal_log_changes"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_meal_log_changes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_meal_log_changes"() TO "service_role";



GRANT ALL ON FUNCTION "public"."time_dist"(time without time zone, time without time zone) TO "postgres";
GRANT ALL ON FUNCTION "public"."time_dist"(time without time zone, time without time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."time_dist"(time without time zone, time without time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."time_dist"(time without time zone, time without time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."toggle_review_status"("p_usage_record_id" "uuid", "p_reviewer_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."toggle_review_status"("p_usage_record_id" "uuid", "p_reviewer_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."toggle_review_status"("p_usage_record_id" "uuid", "p_reviewer_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."ts_dist"(timestamp without time zone, timestamp without time zone) TO "postgres";
GRANT ALL ON FUNCTION "public"."ts_dist"(timestamp without time zone, timestamp without time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."ts_dist"(timestamp without time zone, timestamp without time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."ts_dist"(timestamp without time zone, timestamp without time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."tstz_dist"(timestamp with time zone, timestamp with time zone) TO "postgres";
GRANT ALL ON FUNCTION "public"."tstz_dist"(timestamp with time zone, timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."tstz_dist"(timestamp with time zone, timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."tstz_dist"(timestamp with time zone, timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";


















GRANT ALL ON TABLE "public"."budget_allocations" TO "anon";
GRANT ALL ON TABLE "public"."budget_allocations" TO "authenticated";
GRANT ALL ON TABLE "public"."budget_allocations" TO "service_role";



GRANT ALL ON TABLE "public"."divisions" TO "anon";
GRANT ALL ON TABLE "public"."divisions" TO "authenticated";
GRANT ALL ON TABLE "public"."divisions" TO "service_role";



GRANT ALL ON TABLE "public"."members" TO "anon";
GRANT ALL ON TABLE "public"."members" TO "authenticated";
GRANT ALL ON TABLE "public"."members" TO "service_role";



GRANT ALL ON TABLE "public"."teams" TO "anon";
GRANT ALL ON TABLE "public"."teams" TO "authenticated";
GRANT ALL ON TABLE "public"."teams" TO "service_role";



GRANT ALL ON TABLE "public"."budget_summary" TO "anon";
GRANT ALL ON TABLE "public"."budget_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."budget_summary" TO "service_role";



GRANT ALL ON TABLE "public"."global_settings" TO "anon";
GRANT ALL ON TABLE "public"."global_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."global_settings" TO "service_role";



GRANT ALL ON TABLE "public"."holidays" TO "anon";
GRANT ALL ON TABLE "public"."holidays" TO "authenticated";
GRANT ALL ON TABLE "public"."holidays" TO "service_role";



GRANT ALL ON TABLE "public"."lunch_fixed_schedules" TO "anon";
GRANT ALL ON TABLE "public"."lunch_fixed_schedules" TO "authenticated";
GRANT ALL ON TABLE "public"."lunch_fixed_schedules" TO "service_role";



GRANT ALL ON TABLE "public"."lunch_group_excluded_members" TO "anon";
GRANT ALL ON TABLE "public"."lunch_group_excluded_members" TO "authenticated";
GRANT ALL ON TABLE "public"."lunch_group_excluded_members" TO "service_role";



GRANT ALL ON TABLE "public"."lunch_group_members" TO "anon";
GRANT ALL ON TABLE "public"."lunch_group_members" TO "authenticated";
GRANT ALL ON TABLE "public"."lunch_group_members" TO "service_role";



GRANT ALL ON TABLE "public"."lunch_group_settings" TO "anon";
GRANT ALL ON TABLE "public"."lunch_group_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."lunch_group_settings" TO "service_role";



GRANT ALL ON TABLE "public"."lunch_groups" TO "anon";
GRANT ALL ON TABLE "public"."lunch_groups" TO "authenticated";
GRANT ALL ON TABLE "public"."lunch_groups" TO "service_role";



GRANT ALL ON TABLE "public"."meal_logs" TO "anon";
GRANT ALL ON TABLE "public"."meal_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."meal_logs" TO "service_role";



GRANT ALL ON TABLE "public"."member_statuses" TO "anon";
GRANT ALL ON TABLE "public"."member_statuses" TO "authenticated";
GRANT ALL ON TABLE "public"."member_statuses" TO "service_role";



GRANT ALL ON TABLE "public"."member_current_status" TO "anon";
GRANT ALL ON TABLE "public"."member_current_status" TO "authenticated";
GRANT ALL ON TABLE "public"."member_current_status" TO "service_role";



GRANT ALL ON TABLE "public"."monthly_allowances" TO "anon";
GRANT ALL ON TABLE "public"."monthly_allowances" TO "authenticated";
GRANT ALL ON TABLE "public"."monthly_allowances" TO "service_role";



GRANT ALL ON TABLE "public"."monthly_drink_applications" TO "anon";
GRANT ALL ON TABLE "public"."monthly_drink_applications" TO "authenticated";
GRANT ALL ON TABLE "public"."monthly_drink_applications" TO "service_role";



GRANT ALL ON TABLE "public"."monthly_drink_settings" TO "anon";
GRANT ALL ON TABLE "public"."monthly_drink_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."monthly_drink_settings" TO "service_role";



GRANT ALL ON TABLE "public"."organizations" TO "anon";
GRANT ALL ON TABLE "public"."organizations" TO "authenticated";
GRANT ALL ON TABLE "public"."organizations" TO "service_role";



GRANT ALL ON TABLE "public"."push_notification_logs" TO "anon";
GRANT ALL ON TABLE "public"."push_notification_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."push_notification_logs" TO "service_role";



GRANT ALL ON TABLE "public"."push_subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."push_subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."push_subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."restaurants" TO "anon";
GRANT ALL ON TABLE "public"."restaurants" TO "authenticated";
GRANT ALL ON TABLE "public"."restaurants" TO "service_role";



GRANT ALL ON TABLE "public"."settlement_status" TO "anon";
GRANT ALL ON TABLE "public"."settlement_status" TO "authenticated";
GRANT ALL ON TABLE "public"."settlement_status" TO "service_role";



GRANT ALL ON TABLE "public"."sync_queue" TO "anon";
GRANT ALL ON TABLE "public"."sync_queue" TO "authenticated";
GRANT ALL ON TABLE "public"."sync_queue" TO "service_role";



GRANT ALL ON TABLE "public"."usage_record_audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."usage_record_audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."usage_record_audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."user_monthly_stats" TO "anon";
GRANT ALL ON TABLE "public"."user_monthly_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."user_monthly_stats" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































drop extension if exists "pg_net";


