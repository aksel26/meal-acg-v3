-- Refine the default ACG multisource evaluation question set with clearer prompts.

DO $$
DECLARE
    v_set_id uuid;
BEGIN
    SELECT id
      INTO v_set_id
      FROM public.multisource_evaluation_question_sets
     WHERE id = 'b78caad9-4f66-4935-be42-daf0998a4137'::uuid
        OR name = 'ACG 다면평가 기본 SET'
     ORDER BY CASE WHEN id = 'b78caad9-4f66-4935-be42-daf0998a4137'::uuid THEN 0 ELSE 1 END
     LIMIT 1;

    IF v_set_id IS NULL THEN
        INSERT INTO public.multisource_evaluation_question_sets (
            id,
            name,
            description,
            is_active,
            is_default
        )
        VALUES (
            'b78caad9-4f66-4935-be42-daf0998a4137',
            'ACG 다면평가 기본 SET',
            'ACG 다면평가 운영용 기본 문항 SET입니다. 공통 윤리 문항, 상사 평가 중심 성과/역량 문항, 동료 평가 관점의 협업/리더십 문항을 포함합니다.',
            true,
            true
        )
        RETURNING id INTO v_set_id;
    END IF;

    UPDATE public.multisource_evaluation_question_sets
       SET name = 'ACG 다면평가 기본 SET',
           description = 'ACG 다면평가 운영용 기본 문항 SET입니다. 공통 윤리 문항, 상사 평가 중심 성과/역량 문항, 동료 평가 관점의 협업/리더십 문항을 포함합니다.',
           is_active = true,
           is_default = true,
           updated_at = now()
     WHERE id = v_set_id;

    UPDATE public.multisource_evaluation_question_sets
       SET is_default = false,
           updated_at = now()
     WHERE id <> v_set_id
       AND is_default = true;

    DELETE FROM public.multisource_evaluation_question_set_items
     WHERE question_set_id = v_set_id;

    WITH position_groups AS (
        SELECT id,
               name,
               CASE
                   WHEN name IN ('인턴', '사원', '선임') THEN 'member'
                   WHEN name IN ('책임', '수석', '대표') THEN 'leader'
                   ELSE 'member'
               END AS group_key
          FROM public.positions
         WHERE name IN ('인턴', '사원', '선임', '책임', '수석', '대표')
    ),
    question_templates AS (
        SELECT *
          FROM (VALUES
            (
                1,
                'both',
                ARRAY['상사', '동료']::text[],
                'subjective'::public.multisource_evaluation_question_type,
                '공통',
                '존중과 신뢰',
                '협업 과정에서 구성원의 심리적 안전을 해치는 행동이 있었는지 확인합니다. 차별, 모욕, 폭언, 성희롱, 따돌림, 보복성 업무 지시 등 구체적인 사례가 있다면 사실 중심으로 작성해 주세요. 해당 사항이 없으면 ''없음''으로 작성해 주세요.',
                '주관식: 사례 발생 여부와 상황, 빈도, 영향을 구체적으로 작성합니다.',
                NULL::numeric,
                '{}'::jsonb
            ),
            (
                2,
                'leader',
                ARRAY['상사']::text[],
                'score'::public.multisource_evaluation_question_type,
                '업무태도',
                '고객가치 지향',
                '업무의 목적을 고객 관점에서 이해하고, 고객의 현재 니즈와 잠재 니즈를 반영하여 실질적인 가치를 만들기 위해 노력합니다.',
                '1점: 고객 상황 이해가 부족하고 수동적으로 대응합니다.' || E'\n' ||
                '3점: 고객 니즈를 이해하고 요구 수준에 맞게 대응합니다.' || E'\n' ||
                '5점: 잠재 니즈까지 파악해 개선안을 제안하고 고객 만족과 부가가치 창출에 기여합니다.',
                1::numeric,
                jsonb_build_object('1', 1, '2', 2, '3', 3, '4', 4, '5', 5)
            ),
            (
                3,
                'member',
                ARRAY['상사', '동료']::text[],
                'score'::public.multisource_evaluation_question_type,
                '업무태도',
                '소통과 협업',
                '동료와 필요한 정보를 적시에 공유하고, 갈등 상황에서도 업무 목표를 중심으로 조율하며 팀 성과에 기여합니다.',
                '1점: 소통 누락이나 방어적 태도로 협업 비용을 키웁니다.' || E'\n' ||
                '3점: 필요한 협업에 참여하고 업무 소통을 무리 없이 수행합니다.' || E'\n' ||
                '5점: 협업 흐름을 주도적으로 정리하고 팀 분위기와 성과 개선에 기여합니다.' || E'\n' ||
                '운영 기준: 상사 점수 90% + 동료 평가 평균 10%로 반영합니다.',
                1::numeric,
                jsonb_build_object('1', 1, '2', 2, '3', 3, '4', 4, '5', 5)
            ),
            (
                4,
                'both',
                ARRAY['상사']::text[],
                'score'::public.multisource_evaluation_question_type,
                '실행역량',
                '업무 신속성',
                '업무의 중요도와 마감 시점을 고려해 우선순위를 세우고, 필요한 의사결정을 지연시키지 않으며 실행 속도를 관리합니다.',
                '1점: 마감 지연이 잦고 우선순위 판단이 미흡합니다.' || E'\n' ||
                '3점: 계획한 일정에 맞춰 업무를 완료합니다.' || E'\n' ||
                '5점: 변수까지 고려해 선제적으로 대응하고 기대 일정보다 빠르게 결과를 냅니다.',
                1::numeric,
                jsonb_build_object('1', 1, '2', 2, '3', 3, '4', 4, '5', 5)
            ),
            (
                5,
                'both',
                ARRAY['상사']::text[],
                'score'::public.multisource_evaluation_question_type,
                '실행역량',
                '결과물 완성도',
                '요구사항을 정확히 이해하고 논리적 판단을 바탕으로 본인 직급에 기대되는 수준 이상의 결과물을 안정적으로 제시합니다.',
                '1점: 요구사항 누락이나 품질 미달로 재작업이 자주 발생합니다.' || E'\n' ||
                '3점: 기대 수준에 맞는 결과물을 안정적으로 제출합니다.' || E'\n' ||
                '5점: 기대 수준을 넘어서는 완성도와 개선 관점을 담아 결과물을 제시합니다.',
                1::numeric,
                jsonb_build_object('1', 1, '2', 2, '3', 3, '4', 4, '5', 5)
            ),
            (
                6,
                'both',
                ARRAY['상사']::text[],
                'score'::public.multisource_evaluation_question_type,
                '전문성',
                '업무 전문성',
                '담당 업무에 필요한 지식과 절차를 이해하고, 상황에 맞게 방법을 조정하며 문제 해결에 적용합니다.',
                '1점: 기본 지식이나 절차 이해가 부족해 업무 품질이 흔들립니다.' || E'\n' ||
                '3점: 필요한 지식과 절차를 이해하고 안정적으로 적용합니다.' || E'\n' ||
                '5점: 복잡한 상황에서도 전문성을 바탕으로 방법을 고도화하고 주변에 기준을 제시합니다.',
                1::numeric,
                jsonb_build_object('1', 1, '2', 2, '3', 3, '4', 4, '5', 5)
            ),
            (
                7,
                'leader',
                ARRAY['상사']::text[],
                'score'::public.multisource_evaluation_question_type,
                '개선역량',
                '업무 프로세스 개선',
                '팀 운영과 업무 추진 과정에서 비효율을 발견하고, 실행 가능한 개선안을 제안하거나 적용해 업무 효율을 높입니다.',
                '1점: 기존 방식을 고수하고 개선 필요성에 소극적입니다.' || E'\n' ||
                '3점: 개선 필요성을 인지하고 요청된 범위에서 개선에 참여합니다.' || E'\n' ||
                '5점: 문제를 선제적으로 발견하고 개선안을 실행해 성과나 효율 향상에 기여합니다.',
                1::numeric,
                jsonb_build_object('1', 1, '2', 2, '3', 3, '4', 4, '5', 5)
            ),
            (
                8,
                'leader',
                ARRAY['상사']::text[],
                'score'::public.multisource_evaluation_question_type,
                '리더십',
                '구성원 육성',
                '팀 목표와 구성원의 역량 수준을 함께 고려하여 업무를 배분하고, 성장에 필요한 기회와 피드백을 제공합니다.',
                '1점: 업무 배분 기준이 불명확하고 특정 구성원에게 부담이 치우칩니다.' || E'\n' ||
                '3점: 팀 상황에 맞춰 업무를 균형 있게 배분합니다.' || E'\n' ||
                '5점: 목표 달성과 구성원 성장을 함께 고려해 역할을 설계하고 후속 피드백을 제공합니다.',
                1::numeric,
                jsonb_build_object('1', 1, '2', 2, '3', 3, '4', 4, '5', 5)
            ),
            (
                9,
                'leader',
                ARRAY['동료']::text[],
                'score'::public.multisource_evaluation_question_type,
                '리더십',
                '의견 수렴과 심리적 안전',
                '구성원이 편하게 의견을 제시할 수 있는 분위기를 만들고, 업무 고충이나 반대 의견을 경청하며 해결을 위해 노력합니다.',
                '1점: 권위적이거나 일방적인 방식으로 의견 제시를 어렵게 만듭니다.' || E'\n' ||
                '3점: 구성원의 의견을 듣고 필요한 경우 조율합니다.' || E'\n' ||
                '5점: 다른 의견을 적극적으로 수용하고 고충 해결을 위한 후속 행동까지 이어갑니다.',
                1::numeric,
                jsonb_build_object('1', 1, '2', 2, '3', 3, '4', 4, '5', 5)
            ),
            (
                10,
                'leader',
                ARRAY['동료']::text[],
                'subjective'::public.multisource_evaluation_question_type,
                '리더십',
                '피드백 스타일',
                '상사 또는 리더의 업무 피드백 방식이 구성원의 실행과 성장에 어떤 영향을 주는지 구체적으로 작성해 주세요. 도움이 되었던 점과 보완되면 좋을 점을 함께 적어 주세요.',
                '주관식: 실제 피드백 장면, 전달 방식, 후속 지원 여부를 중심으로 작성합니다.',
                NULL::numeric,
                '{}'::jsonb
            )
          ) AS q(base_order, target_group, evaluator_types, question_type, category, subcategory, detail, scale_guide, weight, scale_weights)
    )
    INSERT INTO public.multisource_evaluation_question_set_items (
        question_set_id,
        position_id,
        question_type,
        prompt,
        weight,
        sort_order,
        is_required,
        category,
        subcategory,
        detail,
        scale_guide,
        scale_min,
        scale_max,
        evaluator_title_ids,
        scale_weights,
        evaluator_types
    )
    SELECT v_set_id,
           p.id,
           q.question_type,
           q.category || ' > ' || q.subcategory || E'\n' || q.detail || E'\n\n' || q.scale_guide,
           q.weight,
           (q.base_order * 100) +
               CASE p.name
                   WHEN '인턴' THEN 1
                   WHEN '사원' THEN 2
                   WHEN '선임' THEN 3
                   WHEN '책임' THEN 4
                   WHEN '수석' THEN 5
                   WHEN '대표' THEN 6
                   ELSE 9
               END,
           true,
           q.category,
           q.subcategory,
           q.detail,
           q.scale_guide,
           1,
           5,
           ARRAY(
               SELECT title.id
                 FROM public.titles title
                WHERE CASE
                          WHEN q.evaluator_types = ARRAY['상사', '동료']::text[] THEN title.name IN ('대표', '본부장', '팀장', '파트장')
                          WHEN q.evaluator_types = ARRAY['상사']::text[] THEN title.name IN ('대표', '본부장', '팀장')
                          WHEN q.evaluator_types = ARRAY['동료']::text[] THEN title.name IN ('팀장', '파트장')
                          ELSE false
                      END
                ORDER BY title.sort_order NULLS LAST, title.name
           ),
           q.scale_weights,
           q.evaluator_types
      FROM question_templates q
      JOIN position_groups p
        ON q.target_group = 'both'
        OR q.target_group = p.group_key;
END;
$$;
