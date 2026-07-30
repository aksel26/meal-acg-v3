// 사규 데이터 — ACG Life 화면과 서버(/api/chat)가 공유하는 단일 원천

export interface Regulation {
  id: string;
  title: string;
  content: string;
  updatedAt: string;
}

export interface RegulationCategory {
  id: string;
  title: string;
  regulations: Regulation[];
}

export const REGULATION_CATEGORIES: RegulationCategory[] = [
  {
    id: "work",
    title: "근무 규정",
    regulations: [
      {
        id: "w1",
        title: "근무 시간",
        content:
          "기본 근무 시간은 09:00~18:00이며, 유연근무제를 적용하여 08:00~10:00 사이 출근 가능합니다. 주 40시간 근무를 기본으로 합니다.",
        updatedAt: "2026-01-15",
      },
      {
        id: "w2",
        title: "재택근무",
        content:
          "팀장 승인 하에 주 2회까지 재택근무가 가능합니다. 재택근무 시에도 출퇴근 기록을 앱에서 정상적으로 입력해야 합니다.",
        updatedAt: "2026-02-01",
      },
      {
        id: "w3",
        title: "시간외 근무",
        content:
          "시간외 근무는 사전 승인 후 진행해야 하며, 월 52시간을 초과할 수 없습니다. 시간외 근무 수당은 근로기준법에 따라 지급됩니다.",
        updatedAt: "2025-12-01",
      },
    ],
  },
  {
    id: "leave",
    title: "휴가/연차 규정",
    regulations: [
      {
        id: "l1",
        title: "연차 휴가",
        content:
          "입사 1년 미만: 1개월 개근 시 1일 발생(최대 11일). 1년 이상: 1년간 출근율 80% 이상이면 15일 부여. 3년 이상: 최초 1년 초과 근속 2년마다 1일 추가(최대 25일). 미사용 연차는 수당으로 정산됩니다.",
        updatedAt: "2026-07-30",
      },
      {
        id: "l2",
        title: "반차/반반차",
        content:
          "오전 반차 (09:00~13:00), 오후 반차 (14:00~18:00) 사용 가능합니다. 반반차는 2시간 단위로 사용하며, 연차 0.25일이 차감됩니다.",
        updatedAt: "2026-01-01",
      },
      {
        id: "l3",
        title: "경조사 휴가",
        content:
          "본인 결혼: 5일, 자녀 결혼: 1일, 부모/배우자 사망: 5일, 조부모/형제자매 사망: 3일. 경조금은 별도 지급됩니다.",
        updatedAt: "2025-06-01",
      },
    ],
  },
  {
    id: "welfare",
    title: "복리후생 규정",
    regulations: [
      {
        id: "b1",
        title: "식대 지원",
        content:
          "근무일 기준 1일 13,000원의 식대가 지원됩니다. 재택근무, 연차, 개별식사 시에는 식대가 차감됩니다. 주말 근무 시 별도 식대가 지급됩니다.",
        updatedAt: "2026-04-01",
      },
      {
        id: "b2",
        title: "복지포인트",
        content:
          "연간 복지포인트가 지급되며, 자기계발, 건강관리, 문화생활 등에 사용 가능합니다. 미사용 포인트는 이월되지 않습니다.",
        updatedAt: "2026-01-01",
      },
      {
        id: "b3",
        title: "교육/자기계발 지원",
        content:
          "업무 관련 교육, 자격증 취득, 도서 구입 등에 연간 지원금을 사용할 수 있습니다. 사전 신청 및 팀장 승인이 필요합니다.",
        updatedAt: "2025-09-01",
      },
    ],
  },
  {
    id: "security",
    title: "보안 규정",
    regulations: [
      {
        id: "s1",
        title: "정보보안 기본 수칙",
        content:
          "사내 정보는 외부 유출이 금지되며, 업무용 PC에 개인 소프트웨어 설치를 제한합니다. 비밀번호는 분기 1회 변경해야 합니다.",
        updatedAt: "2026-03-01",
      },
      {
        id: "s2",
        title: "개인정보 보호",
        content:
          "고객 및 구직자 개인정보는 목적 외 사용이 금지되며, 개인정보보호법에 따라 처리합니다. 위반 시 징계 사유에 해당합니다.",
        updatedAt: "2026-02-15",
      },
    ],
  },
];
