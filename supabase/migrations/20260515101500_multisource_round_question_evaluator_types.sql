-- Persist evaluator subject types on round questions.
-- Question SET items already carry evaluator_types; round questions must keep
-- the same snapshot so assignment generation and validation can use it later.

ALTER TABLE "public"."multisource_evaluation_questions"
    ADD COLUMN IF NOT EXISTS "evaluator_types" text[] NOT NULL DEFAULT ARRAY['상사', '동료']::text[];

UPDATE "public"."multisource_evaluation_questions"
   SET evaluator_types = ARRAY['상사', '동료']::text[]
 WHERE cardinality(evaluator_types) = 0;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
          FROM pg_constraint
         WHERE conname = 'multisource_evaluation_questions_evaluator_types_check'
    ) THEN
        ALTER TABLE "public"."multisource_evaluation_questions"
            ADD CONSTRAINT "multisource_evaluation_questions_evaluator_types_check"
            CHECK ("evaluator_types" <@ ARRAY['상사', '동료']::text[]);
    END IF;
END;
$$;
