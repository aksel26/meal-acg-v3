-- Multisource evaluation setup tables for the admin app.

CREATE TYPE "public"."multisource_evaluation_round_status" AS ENUM (
    'draft',
    'confirmed',
    'closed'
);

CREATE TYPE "public"."multisource_evaluation_question_type" AS ENUM (
    'score',
    'subjective'
);

CREATE TYPE "public"."multisource_evaluation_assignment_source" AS ENUM (
    'auto_same_team',
    'auto_leader',
    'manual'
);

CREATE TABLE IF NOT EXISTS "public"."multisource_evaluation_rounds" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "name" text NOT NULL,
    "description" text,
    "start_date" date NOT NULL,
    "end_date" date NOT NULL,
    "status" "public"."multisource_evaluation_round_status" NOT NULL DEFAULT 'draft',
    "is_deployed" boolean NOT NULL DEFAULT false,
    "config_version" integer NOT NULL DEFAULT 1,
    "confirmed_at" timestamp with time zone,
    "confirmed_by" uuid,
    "deployed_at" timestamp with time zone,
    "deployed_by" uuid,
    "created_by" uuid,
    "updated_by" uuid,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "multisource_evaluation_rounds_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "multisource_evaluation_rounds_period_check" CHECK ("start_date" <= "end_date"),
    CONSTRAINT "multisource_evaluation_rounds_config_version_check" CHECK ("config_version" > 0),
    CONSTRAINT "multisource_evaluation_rounds_confirmed_by_fkey" FOREIGN KEY ("confirmed_by") REFERENCES "public"."members"("id") ON DELETE SET NULL,
    CONSTRAINT "multisource_evaluation_rounds_deployed_by_fkey" FOREIGN KEY ("deployed_by") REFERENCES "public"."members"("id") ON DELETE SET NULL,
    CONSTRAINT "multisource_evaluation_rounds_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."members"("id") ON DELETE SET NULL,
    CONSTRAINT "multisource_evaluation_rounds_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."members"("id") ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS "public"."multisource_evaluation_questions" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "round_id" uuid NOT NULL,
    "position_id" uuid NOT NULL,
    "question_type" "public"."multisource_evaluation_question_type" NOT NULL,
    "prompt" text NOT NULL,
    "weight" numeric(8, 2),
    "sort_order" integer NOT NULL DEFAULT 1,
    "is_required" boolean NOT NULL DEFAULT true,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "multisource_evaluation_questions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "multisource_evaluation_questions_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "public"."multisource_evaluation_rounds"("id") ON DELETE CASCADE,
    CONSTRAINT "multisource_evaluation_questions_position_id_fkey" FOREIGN KEY ("position_id") REFERENCES "public"."positions"("id") ON DELETE RESTRICT,
    CONSTRAINT "multisource_evaluation_questions_prompt_check" CHECK (length(btrim("prompt")) > 0),
    CONSTRAINT "multisource_evaluation_questions_score_weight_check" CHECK (
        ("question_type" = 'score' AND "weight" IS NOT NULL AND "weight" > 0)
        OR ("question_type" = 'subjective' AND "weight" IS NULL)
    )
);

CREATE TABLE IF NOT EXISTS "public"."multisource_evaluation_subjects" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "round_id" uuid NOT NULL,
    "member_id" uuid NOT NULL,
    "is_excluded" boolean NOT NULL DEFAULT false,
    "excluded_reason" text,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "multisource_evaluation_subjects_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "multisource_evaluation_subjects_round_member_key" UNIQUE ("round_id", "member_id"),
    CONSTRAINT "multisource_evaluation_subjects_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "public"."multisource_evaluation_rounds"("id") ON DELETE CASCADE,
    CONSTRAINT "multisource_evaluation_subjects_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "public"."multisource_evaluation_assignments" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "round_id" uuid NOT NULL,
    "subject_member_id" uuid NOT NULL,
    "evaluator_member_id" uuid NOT NULL,
    "source" "public"."multisource_evaluation_assignment_source" NOT NULL DEFAULT 'manual',
    "is_excluded" boolean NOT NULL DEFAULT false,
    "excluded_reason" text,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "multisource_evaluation_assignments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "multisource_evaluation_assignments_round_subject_evaluator_key" UNIQUE ("round_id", "subject_member_id", "evaluator_member_id"),
    CONSTRAINT "multisource_evaluation_assignments_no_self_check" CHECK ("subject_member_id" <> "evaluator_member_id"),
    CONSTRAINT "multisource_evaluation_assignments_subject_fkey" FOREIGN KEY ("round_id", "subject_member_id") REFERENCES "public"."multisource_evaluation_subjects"("round_id", "member_id") ON DELETE CASCADE,
    CONSTRAINT "multisource_evaluation_assignments_subject_member_id_fkey" FOREIGN KEY ("subject_member_id") REFERENCES "public"."members"("id") ON DELETE CASCADE,
    CONSTRAINT "multisource_evaluation_assignments_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "public"."multisource_evaluation_rounds"("id") ON DELETE CASCADE,
    CONSTRAINT "multisource_evaluation_assignments_evaluator_member_id_fkey" FOREIGN KEY ("evaluator_member_id") REFERENCES "public"."members"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "public"."multisource_evaluation_audit_logs" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "round_id" uuid,
    "actor_member_id" uuid,
    "action" text NOT NULL,
    "target_table" text NOT NULL,
    "target_id" uuid,
    "old_data" jsonb,
    "new_data" jsonb,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "multisource_evaluation_audit_logs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "multisource_evaluation_audit_logs_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "public"."multisource_evaluation_rounds"("id") ON DELETE SET NULL,
    CONSTRAINT "multisource_evaluation_audit_logs_actor_member_id_fkey" FOREIGN KEY ("actor_member_id") REFERENCES "public"."members"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "idx_multisource_evaluation_rounds_is_deployed"
    ON "public"."multisource_evaluation_rounds" ("is_deployed");

CREATE INDEX IF NOT EXISTS "idx_multisource_evaluation_questions_round_position"
    ON "public"."multisource_evaluation_questions" ("round_id", "position_id");

CREATE INDEX IF NOT EXISTS "idx_multisource_evaluation_subjects_round_member"
    ON "public"."multisource_evaluation_subjects" ("round_id", "member_id");

CREATE INDEX IF NOT EXISTS "idx_multisource_evaluation_assignments_round_subject"
    ON "public"."multisource_evaluation_assignments" ("round_id", "subject_member_id");

CREATE INDEX IF NOT EXISTS "idx_multisource_evaluation_audit_logs_round"
    ON "public"."multisource_evaluation_audit_logs" ("round_id", "created_at" DESC);

CREATE OR REPLACE TRIGGER "set_multisource_evaluation_rounds_updated_at"
    BEFORE UPDATE ON "public"."multisource_evaluation_rounds"
    FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

CREATE OR REPLACE TRIGGER "set_multisource_evaluation_questions_updated_at"
    BEFORE UPDATE ON "public"."multisource_evaluation_questions"
    FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

CREATE OR REPLACE TRIGGER "set_multisource_evaluation_subjects_updated_at"
    BEFORE UPDATE ON "public"."multisource_evaluation_subjects"
    FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

CREATE OR REPLACE TRIGGER "set_multisource_evaluation_assignments_updated_at"
    BEFORE UPDATE ON "public"."multisource_evaluation_assignments"
    FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

CREATE OR REPLACE FUNCTION "public"."assert_multisource_evaluation_round_editable"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_is_deployed boolean;
    v_round_id uuid;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_round_id := OLD.round_id;
    ELSE
        v_round_id := NEW.round_id;
    END IF;

    SELECT r.is_deployed
      INTO v_is_deployed
      FROM public.multisource_evaluation_rounds r
     WHERE r.id = v_round_id;

    IF v_is_deployed THEN
        RAISE EXCEPTION 'Cannot modify multisource evaluation setup while the round is deployed';
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."assert_multisource_evaluation_round_update_allowed"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF OLD.is_deployed AND (
        NEW.name IS DISTINCT FROM OLD.name
        OR NEW.description IS DISTINCT FROM OLD.description
        OR NEW.start_date IS DISTINCT FROM OLD.start_date
        OR NEW.end_date IS DISTINCT FROM OLD.end_date
        OR NEW.status IS DISTINCT FROM OLD.status
        OR NEW.config_version IS DISTINCT FROM OLD.config_version
    ) THEN
        RAISE EXCEPTION 'Cannot modify multisource evaluation round while it is deployed';
    END IF;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER "assert_multisource_evaluation_round_update_allowed"
    BEFORE UPDATE ON "public"."multisource_evaluation_rounds"
    FOR EACH ROW EXECUTE FUNCTION "public"."assert_multisource_evaluation_round_update_allowed"();

CREATE OR REPLACE TRIGGER "assert_multisource_evaluation_questions_editable"
    BEFORE INSERT OR UPDATE OR DELETE ON "public"."multisource_evaluation_questions"
    FOR EACH ROW EXECUTE FUNCTION "public"."assert_multisource_evaluation_round_editable"();

CREATE OR REPLACE TRIGGER "assert_multisource_evaluation_subjects_editable"
    BEFORE INSERT OR UPDATE OR DELETE ON "public"."multisource_evaluation_subjects"
    FOR EACH ROW EXECUTE FUNCTION "public"."assert_multisource_evaluation_round_editable"();

CREATE OR REPLACE TRIGGER "assert_multisource_evaluation_assignments_editable"
    BEFORE INSERT OR UPDATE OR DELETE ON "public"."multisource_evaluation_assignments"
    FOR EACH ROW EXECUTE FUNCTION "public"."assert_multisource_evaluation_round_editable"();
