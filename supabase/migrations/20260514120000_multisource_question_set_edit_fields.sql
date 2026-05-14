-- Editable workbook-style fields for question set items.

ALTER TABLE "public"."multisource_evaluation_question_set_items"
    ADD COLUMN IF NOT EXISTS "category" text,
    ADD COLUMN IF NOT EXISTS "subcategory" text,
    ADD COLUMN IF NOT EXISTS "detail" text,
    ADD COLUMN IF NOT EXISTS "scale_guide" text,
    ADD COLUMN IF NOT EXISTS "scale_min" integer NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS "scale_max" integer NOT NULL DEFAULT 5,
    ADD COLUMN IF NOT EXISTS "evaluator_title_ids" uuid[] NOT NULL DEFAULT '{}'::uuid[];

UPDATE "public"."multisource_evaluation_question_set_items" item
   SET category = COALESCE(
           NULLIF(btrim(split_part(split_part(item.prompt, E'\n', 1), '>', 1)), ''),
           category
       ),
       subcategory = COALESCE(
           NULLIF(btrim(split_part(split_part(item.prompt, E'\n', 1), '>', 2)), ''),
           subcategory
       ),
       detail = COALESCE(
           NULLIF(
               btrim(
                   regexp_replace(
                       regexp_replace(item.prompt, '^.*\n', ''),
                       E'\n\n(1점:|3점:|5점:|응답 안내:|운영 기준:).*$',
                       '',
                       's'
                   )
               ),
               ''
           ),
           detail,
           item.prompt
       ),
       scale_guide = COALESCE(
           NULLIF(
               btrim(
                   substring(
                       regexp_replace(item.prompt, '^.*\n', '')
                       FROM E'(1점:|3점:|5점:|응답 안내:|운영 기준:).*$'
                   )
               ),
               ''
           ),
           scale_guide,
           CASE
               WHEN item.question_type = 'score' THEN '5점 척도'
               ELSE '주관식'
           END
       )
 WHERE item.category IS NULL
    OR item.subcategory IS NULL
    OR item.detail IS NULL
    OR item.scale_guide IS NULL;

UPDATE "public"."multisource_evaluation_question_set_items" item
   SET evaluator_title_ids = ARRAY(
       SELECT title.id
         FROM public.titles title
        WHERE CASE
                  WHEN floor(item.sort_order / 100) = 1 THEN title.name IN ('대표', '본부장', '팀장', '파트장')
                  WHEN floor(item.sort_order / 100) BETWEEN 2 AND 8 THEN title.name IN ('대표', '본부장', '팀장')
                  WHEN floor(item.sort_order / 100) IN (9, 10) THEN title.name IN ('팀장', '파트장')
                  ELSE false
              END
        ORDER BY title.sort_order NULLS LAST, title.name
   )
 WHERE cardinality(item.evaluator_title_ids) = 0;

ALTER TABLE "public"."multisource_evaluation_question_set_items"
    ADD CONSTRAINT "multisource_evaluation_question_set_items_scale_check"
    CHECK ("scale_min" > 0 AND "scale_max" >= "scale_min");
