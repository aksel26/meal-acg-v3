CREATE TABLE public.parking_notice_settings (
  id text PRIMARY KEY DEFAULT 'default' CHECK (id = 'default'),
  content jsonb NOT NULL CHECK (jsonb_typeof(content) = 'object'),
  updated_by uuid REFERENCES public.members(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER set_parking_notice_settings_updated_at
  BEFORE UPDATE ON public.parking_notice_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.parking_notice_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_role_all ON public.parking_notice_settings
  FOR ALL TO service_role USING (true) WITH CHECK (true);

REVOKE ALL ON public.parking_notice_settings FROM anon, authenticated;
GRANT ALL ON public.parking_notice_settings TO service_role;

INSERT INTO public.parking_notice_settings (id, content)
VALUES (
  'default',
  $notice$
  {
    "type": "doc",
    "content": [
      {
        "type": "heading",
        "attrs": { "level": 2 },
        "content": [{ "type": "text", "text": "2시간 주차권" }]
      },
      {
        "type": "paragraph",
        "content": [
          {
            "type": "text",
            "marks": [
              {
                "type": "link",
                "attrs": {
                  "href": "http://tw3685.iptime.org:8088/user/login.htm",
                  "target": "_blank",
                  "rel": "noopener noreferrer"
                }
              }
            ],
            "text": "http://tw3685.iptime.org:8088/user/login.htm"
          }
        ]
      },
      {
        "type": "paragraph",
        "content": [
          {
            "type": "text",
            "text": "로그인 정보는 관리자 화면에서 설정해주세요."
          }
        ]
      },
      {
        "type": "paragraph",
        "content": [
          {
            "type": "text",
            "text": "2시간 이상 방문고객 차량 및 개인주차는 P&C팀으로 문의"
          }
        ]
      },
      {
        "type": "heading",
        "attrs": { "level": 2 },
        "content": [{ "type": "text", "text": "주차 요금" }]
      },
      {
        "type": "paragraph",
        "content": [
          {
            "type": "text",
            "marks": [{ "type": "bold" }],
            "text": "구분 · 시간 · 직원 · 외부인 · 주차비"
          }
        ]
      },
      {
        "type": "bulletList",
        "content": [
          {
            "type": "listItem",
            "content": [
              {
                "type": "paragraph",
                "content": [{ "type": "text", "text": "2시간: 직원 무료, 외부인 P&C팀 문의" }]
              }
            ]
          },
          {
            "type": "listItem",
            "content": [
              {
                "type": "paragraph",
                "content": [{ "type": "text", "text": "추가 30분: 750원" }]
              }
            ]
          },
          {
            "type": "listItem",
            "content": [
              {
                "type": "paragraph",
                "content": [{ "type": "text", "text": "추가 1시간: 1,500원" }]
              }
            ]
          },
          {
            "type": "listItem",
            "content": [
              {
                "type": "paragraph",
                "content": [{ "type": "text", "text": "추가 2시간: 3,000원" }]
              }
            ]
          },
          {
            "type": "listItem",
            "content": [
              {
                "type": "paragraph",
                "content": [{ "type": "text", "text": "추가 3시간: 4,500원" }]
              }
            ]
          },
          {
            "type": "listItem",
            "content": [
              {
                "type": "paragraph",
                "content": [{ "type": "text", "text": "추가 4시간: 6,000원" }]
              }
            ]
          },
          {
            "type": "listItem",
            "content": [
              {
                "type": "paragraph",
                "content": [{ "type": "text", "text": "추가 5시간: 7,500원" }]
              }
            ]
          },
          {
            "type": "listItem",
            "content": [
              {
                "type": "paragraph",
                "content": [{ "type": "text", "text": "추가 6시간: 9,000원" }]
              }
            ]
          },
          {
            "type": "listItem",
            "content": [
              {
                "type": "paragraph",
                "content": [{ "type": "text", "text": "추가 7시간: 10,500원" }]
              }
            ]
          },
          {
            "type": "listItem",
            "content": [
              {
                "type": "paragraph",
                "content": [{ "type": "text", "text": "추가 8시간: 12,000원" }]
              }
            ]
          },
          {
            "type": "listItem",
            "content": [
              {
                "type": "paragraph",
                "content": [{ "type": "text", "text": "추가 12시간: 15,000원" }]
              }
            ]
          },
          {
            "type": "listItem",
            "content": [
              {
                "type": "paragraph",
                "content": [{ "type": "text", "text": "추가 24시간: 30,000원" }]
              }
            ]
          }
        ]
      },
      {
        "type": "bulletList",
        "content": [
          {
            "type": "listItem",
            "content": [
              {
                "type": "paragraph",
                "content": [{ "type": "text", "text": "업무관련 주차비는 제공" }]
              }
            ]
          },
          {
            "type": "listItem",
            "content": [
              {
                "type": "paragraph",
                "content": [{ "type": "text", "text": "개인차량 주차권 요청 후 입금: 계좌 (국민 : 853801-04-119505)" }]
              }
            ]
          },
          {
            "type": "listItem",
            "content": [
              {
                "type": "paragraph",
                "content": [{ "type": "text", "text": "월 정기 주차 요청: P&C팀 문의" }]
              }
            ]
          }
        ]
      }
    ]
  }
  $notice$::jsonb
);
