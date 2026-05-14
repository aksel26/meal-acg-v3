-- Seed the default ACG multisource evaluation question set from the provided workbook.

DO $$
DECLARE
    v_set_id uuid;
BEGIN
    UPDATE public.multisource_evaluation_question_sets
       SET is_default = false
     WHERE is_default = true;

    SELECT id
      INTO v_set_id
      FROM public.multisource_evaluation_question_sets
     WHERE name = 'ACG 다면평가 기본 SET'
     LIMIT 1;

    IF v_set_id IS NULL THEN
        INSERT INTO public.multisource_evaluation_question_sets (
            name,
            description,
            is_active,
            is_default
        )
        VALUES (
            'ACG 다면평가 기본 SET',
            '다면평가.xlsx ACG 시트 기준. 4점 이상 선택 시 근거 기재, 1/3/5점 기준 확인, 소통과 협업은 상사 90% + 동료 10% 기준을 운영 메모로 반영합니다.',
            true,
            true
        )
        RETURNING id INTO v_set_id;
    ELSE
        UPDATE public.multisource_evaluation_question_sets
           SET description = '다면평가.xlsx ACG 시트 기준. 4점 이상 선택 시 근거 기재, 1/3/5점 기준 확인, 소통과 협업은 상사 90% + 동료 10% 기준을 운영 메모로 반영합니다.',
               is_active = true,
               is_default = true
         WHERE id = v_set_id;

        DELETE FROM public.multisource_evaluation_question_set_items
         WHERE question_set_id = v_set_id;
    END IF;

    WITH position_groups AS (
        SELECT id, name,
               CASE
                   WHEN name IN ('인턴', '사원', '선임') THEN 'member'
                   WHEN name IN ('책임', '수석', '대표') THEN 'leader'
                   ELSE 'member'
               END AS group_key
          FROM public.positions
         WHERE name IN ('인턴', '사원', '선임', '책임', '수석', '대표')
    ),
    questions AS (
        SELECT *
          FROM (VALUES
            (1, 'both', 'subjective'::public.multisource_evaluation_question_type, '공통 > 인격적 대우' || E'\n' ||
             '구성원에게 차별, 모욕, 폭언, 성희롱 등의 신체적/정신적 고통을 주는 행위를 한다.' || E'\n\n' ||
             '응답 안내: 해당되는 사례가 있는 경우 모두 작성해 주세요. 없음 / 차별 / 모욕 / 폭언 / 성희롱 / 기타', NULL::numeric),
            (2, 'leader', 'score'::public.multisource_evaluation_question_type, '업무태도 > 고객 최우선' || E'\n' ||
             '좋은 성과는 고객가치 제고에 있음을 알고 고객을 중심으로 고객에게 가치를 제공하고자 한다.' || E'\n\n' ||
             '1점: 고객입장(상황) 이해 부족, 수동적 대처' || E'\n' ||
             '3점: 고객입장(상황) 이해, 니즈 대응/해결' || E'\n' ||
             '5점: 고객 최우선을 위한 다양한 노력, 현재 니즈+잠재 니즈 대응, 고객만족을 통한 부가가치 창출', 1::numeric),
            (3, 'member', 'score'::public.multisource_evaluation_question_type, '업무태도 > 소통과 협업' || E'\n' ||
             '구성원들과 갈등 없이 잘 융화하고 팀 분위기를 긍정적으로 만들고 적극적으로 소통하고 협업한다.' || E'\n\n' ||
             '1점: 빈번한 갈등, 팀 분위기 저해, 협업에 소극적, 소통 부재' || E'\n' ||
             '3점: 협업 필요 시 참여, 업무 소통 원활, 팀 분위기에 융화' || E'\n' ||
             '5점: 긍정적 팀 분위기 주도, 적극적 소통, 협업 시 주도적 역할 수행, 팀/조직 성과에 기여' || E'\n\n' ||
             '운영 기준: 상사점수 x 0.9 + 동료평가평균 x 0.1', 1::numeric),
            (4, 'both', 'score'::public.multisource_evaluation_question_type, '과업 > 신속성' || E'\n' ||
             '주어진 업무의 중요도를 고려하여 우선순위를 선정하고 업무를 신속하게 처리한다.' || E'\n\n' ||
             '1점: 업무기한 미준수, 우선순위/중요도 고려 미흡, 불필요한/과도한 시간 투자' || E'\n' ||
             '3점: 업무기한 준수, 우선순위/중요도 고려한 계획 수립, 적절한 시간 투자' || E'\n' ||
             '5점: 업무기한 보다 빠르게 완수, 우선순위/중요도/변수(ex. 추가업무 발생) 고려', 1::numeric),
            (5, 'both', 'score'::public.multisource_evaluation_question_type, '과업 > 완성도' || E'\n' ||
             '업무 수행 시 합리적인 의사결정을 진행하고 해당 연차에 기대되는 Output을 제시한다.' || E'\n\n' ||
             '1점: 비합리적/주관적 결정, 결과물 기대수준 미달' || E'\n' ||
             '3점: 요구하는 역할 대부분 수행, 결과물 평균 수준' || E'\n' ||
             '5점: 결과물 기대 수준 상회(ex. 본인 직급 대비 1개 직급 이상 수준 달성)', 1::numeric),
            (6, 'both', 'score'::public.multisource_evaluation_question_type, '과업 > 전문성' || E'\n' ||
             '수행 업무에 대한 전문성과 업무 수행 절차에 대한 이해를 바탕으로 업무를 진행한다.' || E'\n\n' ||
             '1점: 업무 관련 기본지식 부족, 업무 수행 방법/절차에 대한 이해 부족' || E'\n' ||
             '3점: 업무 관련 기본지식 보유, 업무 수행 방법/절차 정확히 이해' || E'\n' ||
             '5점: 업무에 대한 논리적/합리적 접근, 업무 상황에 따라 방법/절차 고도화 및 응용 가능', 1::numeric),
            (7, 'leader', 'score'::public.multisource_evaluation_question_type, '업무태도 > 업무프로세스 개선' || E'\n' ||
             '팀 운영 및 업무 추진에 필요한 개선사항을 적극적으로 제안하여 업무효율성을 제고한다.' || E'\n\n' ||
             '1점: 변화 저항, 개선에 무관심, 기존 업무 방식을 무조건적으로 고수' || E'\n' ||
             '3점: 변화 필요성은 인지, 개선제안은 소극적' || E'\n' ||
             '5점: 변화 필요성 상시 모니터링, 개선사항 적극 개진, 개선을 통한 성과 기여', 1::numeric),
            (8, 'leader', 'score'::public.multisource_evaluation_question_type, '리더십 > 구성원 육성' || E'\n' ||
             '구성원의 성장과 역량 개발 관점을 고려하여 업무를 배분한다.' || E'\n\n' ||
             '1점: 기준 없는 업무 배분, 업무 배분 불균형' || E'\n' ||
             '3점: 팀 상황에 맞는 업무 배분, 균형적 업무 배분' || E'\n' ||
             '5점: 팀 상황 및 구성원 특성을 고려한 업무 배분, 팀 목표 달성과 구성원 역량 향상 고려', 1::numeric),
            (9, 'leader', 'score'::public.multisource_evaluation_question_type, '리더십 > 리더십' || E'\n' ||
             '팀원이 편하게 의견을 제시할 수 있는 분위기를 조성하며, 업무와 관련된 구성원의 고충을 듣고 해결하려고 노력한다.' || E'\n\n' ||
             '1점: 권위적, 무관심, 무조건적인 지시, 의견 무시' || E'\n' ||
             '3점: 편안한 분위기 조성, 팀원 의견에 대한 경청' || E'\n' ||
             '5점: 팀원 의견에 대한 지지/수용, 업무 고충 해결을 위한 노력, 신뢰감 제공', 1::numeric),
            (10, 'leader', 'subjective'::public.multisource_evaluation_question_type, '리더십 > 업무 피드백' || E'\n' ||
             '상사(팀장 혹은 본부장)의 업무 피드백 스타일을 설명해주세요.', NULL::numeric)
          ) AS q(sort_order, target_group, question_type, prompt, weight)
    )
    INSERT INTO public.multisource_evaluation_question_set_items (
        question_set_id,
        position_id,
        question_type,
        prompt,
        weight,
        sort_order,
        is_required
    )
    SELECT v_set_id,
           p.id,
           q.question_type,
           q.prompt,
           q.weight,
           (q.sort_order * 100) +
             CASE p.name
                 WHEN '인턴' THEN 1
                 WHEN '사원' THEN 2
                 WHEN '선임' THEN 3
                 WHEN '책임' THEN 4
                 WHEN '수석' THEN 5
                 WHEN '대표' THEN 6
                 ELSE 9
             END,
           true
      FROM questions q
      JOIN position_groups p
        ON q.target_group = 'both'
        OR q.target_group = p.group_key;
END;
$$;
