-- Evaluator subject types for question set items.

ALTER TABLE "public"."multisource_evaluation_question_set_items"
    ADD COLUMN IF NOT EXISTS "evaluator_types" text[] NOT NULL DEFAULT '{}'::text[];

UPDATE "public"."multisource_evaluation_question_set_items" item
   SET evaluator_types = CASE
       WHEN floor(item.sort_order / 100) = 1 THEN ARRAY['상사', '동료']::text[]
       WHEN floor(item.sort_order / 100) = 3 THEN ARRAY['상사', '동료']::text[]
       WHEN floor(item.sort_order / 100) IN (9, 10) THEN ARRAY['동료']::text[]
       ELSE ARRAY['상사']::text[]
   END
 WHERE cardinality(item.evaluator_types) = 0;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
          FROM pg_constraint
         WHERE conname = 'multisource_evaluation_question_set_items_evaluator_types_check'
    ) THEN
        ALTER TABLE "public"."multisource_evaluation_question_set_items"
            ADD CONSTRAINT "multisource_evaluation_question_set_items_evaluator_types_check"
            CHECK ("evaluator_types" <@ ARRAY['상사', '동료']::text[]);
    END IF;
END;
$$;
