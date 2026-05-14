-- Reusable multisource evaluation question sets for admin setup.

CREATE TABLE IF NOT EXISTS "public"."multisource_evaluation_question_sets" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "name" text NOT NULL,
    "description" text,
    "is_active" boolean NOT NULL DEFAULT true,
    "is_default" boolean NOT NULL DEFAULT false,
    "created_by" uuid,
    "updated_by" uuid,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "multisource_evaluation_question_sets_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "multisource_evaluation_question_sets_name_check" CHECK (length(btrim("name")) > 0),
    CONSTRAINT "multisource_evaluation_question_sets_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."members"("id") ON DELETE SET NULL,
    CONSTRAINT "multisource_evaluation_question_sets_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."members"("id") ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS "public"."multisource_evaluation_question_set_items" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "question_set_id" uuid NOT NULL,
    "position_id" uuid NOT NULL,
    "question_type" "public"."multisource_evaluation_question_type" NOT NULL,
    "prompt" text NOT NULL,
    "weight" numeric(8, 2),
    "sort_order" integer NOT NULL DEFAULT 1,
    "is_required" boolean NOT NULL DEFAULT true,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "multisource_evaluation_question_set_items_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "multisource_evaluation_question_set_items_set_id_fkey" FOREIGN KEY ("question_set_id") REFERENCES "public"."multisource_evaluation_question_sets"("id") ON DELETE CASCADE,
    CONSTRAINT "multisource_evaluation_question_set_items_position_id_fkey" FOREIGN KEY ("position_id") REFERENCES "public"."positions"("id") ON DELETE RESTRICT,
    CONSTRAINT "multisource_evaluation_question_set_items_prompt_check" CHECK (length(btrim("prompt")) > 0),
    CONSTRAINT "multisource_evaluation_question_set_items_score_weight_check" CHECK (
        ("question_type" = 'score' AND "weight" IS NOT NULL AND "weight" > 0)
        OR ("question_type" = 'subjective' AND "weight" IS NULL)
    )
);

ALTER TABLE "public"."multisource_evaluation_rounds"
    ADD COLUMN IF NOT EXISTS "question_set_id" uuid,
    ADD COLUMN IF NOT EXISTS "question_set_applied_at" timestamp with time zone;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
          FROM pg_constraint
         WHERE conname = 'multisource_evaluation_rounds_question_set_id_fkey'
    ) THEN
        ALTER TABLE "public"."multisource_evaluation_rounds"
            ADD CONSTRAINT "multisource_evaluation_rounds_question_set_id_fkey"
            FOREIGN KEY ("question_set_id")
            REFERENCES "public"."multisource_evaluation_question_sets"("id")
            ON DELETE SET NULL;
    END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS "idx_multisource_evaluation_question_sets_single_default"
    ON "public"."multisource_evaluation_question_sets" ("is_default")
    WHERE "is_default" = true;

CREATE INDEX IF NOT EXISTS "idx_multisource_evaluation_question_sets_active"
    ON "public"."multisource_evaluation_question_sets" ("is_active");

CREATE INDEX IF NOT EXISTS "idx_multisource_evaluation_question_set_items_set_position"
    ON "public"."multisource_evaluation_question_set_items" ("question_set_id", "position_id");

CREATE OR REPLACE TRIGGER "set_multisource_evaluation_question_sets_updated_at"
    BEFORE UPDATE ON "public"."multisource_evaluation_question_sets"
    FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

CREATE OR REPLACE TRIGGER "set_multisource_evaluation_question_set_items_updated_at"
    BEFORE UPDATE ON "public"."multisource_evaluation_question_set_items"
    FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

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
        OR NEW.question_set_id IS DISTINCT FROM OLD.question_set_id
        OR NEW.question_set_applied_at IS DISTINCT FROM OLD.question_set_applied_at
    ) THEN
        RAISE EXCEPTION 'Cannot modify multisource evaluation round while it is deployed';
    END IF;

    RETURN NEW;
END;
$$;
