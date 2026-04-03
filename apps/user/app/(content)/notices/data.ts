export interface Attachment {
  name: string;
  size: string;
}

export interface Notice {
  id: string;
  no: number;
  title: string;
  content: string;
  author: string;
  createdAt: string;
  category: "공지" | "일정" | "업데이트";
  pinned: boolean;
  references: string[];
  attachments: Attachment[];
}

export const NOTICES: Notice[] = [
  {
    id: "1",
    no: 10,
    title: "4월 식대 정책 변경 안내",
    content:
      "4월부터 식대 한도가 조정됩니다. 기존 1일 12,000원에서 13,000원으로 변경되며, 주말 근무 시 별도 식대가 지급됩니다.\n\n변경 사항 요약:\n- 1일 식대 한도: 12,000원 → 13,000원\n- 주말 근무 시 별도 식대 지급\n- 야근 식대는 기존과 동일하게 유지\n\n적용 시작일: 2026년 4월 1일부터\n문의사항은 관리팀으로 연락 부탁드립니다.",
    author: "관리팀",
    createdAt: "2026-04-01",
    category: "공지",
    pinned: true,
    references: ["전체"],
    attachments: [
      { name: "4월_식대_정책_안내.pdf", size: "245KB" },
      { name: "식대_변경_비교표.xlsx", size: "32KB" },
    ],
  },
  {
    id: "2",
    no: 9,
    title: "2분기 워크숍 일정 안내",
    content:
      "2026년 2분기 워크숍이 5월 16일~17일 양일간 진행됩니다. 장소는 추후 공지 예정이며, 참석 여부를 4월 말까지 확인해주세요.\n\n일정: 2026년 5월 16일(금) ~ 17일(토)\n장소: 추후 공지\n참석 확인 마감: 4월 30일\n\n프로그램 구성:\n- 1일차: 팀빌딩 활동, 전사 미팅\n- 2일차: 자유 시간, 귀가",
    author: "인사팀",
    createdAt: "2026-03-28",
    category: "일정",
    pinned: false,
    references: ["전체"],
    attachments: [{ name: "2분기_워크숍_프로그램.pdf", size: "1.2MB" }],
  },
  {
    id: "3",
    no: 8,
    title: "시스템 업데이트 v1.3 적용",
    content:
      "앱 v1.3 업데이트가 적용되었습니다. 출퇴근 관리, 휴가 신청 UI가 개선되었고 새로운 대시보드 캘린더가 추가되었습니다.\n\n주요 변경 사항:\n- 대시보드 캘린더 뷰 추가\n- 출퇴근 관리 UI 개선\n- 휴가 신청 프로세스 간소화\n- 공지/일정 페이지 신규 오픈\n- 전반적인 디자인 개선",
    author: "개발팀",
    createdAt: "2026-03-25",
    category: "업데이트",
    pinned: false,
    references: ["개발팀", "디자인팀"],
    attachments: [{ name: "v1.3_릴리즈노트.pdf", size: "180KB" }],
  },
  {
    id: "4",
    no: 7,
    title: "3월 복지포인트 사용 마감 안내",
    content:
      "3월 복지포인트 사용 마감일은 3월 31일입니다. 미사용 포인트는 이월되지 않으니 기한 내 사용 부탁드립니다.",
    author: "관리팀",
    createdAt: "2026-03-20",
    category: "공지",
    pinned: false,
    references: ["전체"],
    attachments: [],
  },
  {
    id: "5",
    no: 6,
    title: "사무실 이전 안내",
    content:
      "4월 중순 사무실 이전이 예정되어 있습니다. 새 사무실 위치 및 이전 일정은 별도 안내드리겠습니다.",
    author: "총무팀",
    createdAt: "2026-03-18",
    category: "공지",
    pinned: false,
    references: ["전체"],
    attachments: [{ name: "신사무실_위치안내.pdf", size: "520KB" }],
  },
  {
    id: "6",
    no: 5,
    title: "정기 건강검진 일정",
    content:
      "2026년 상반기 정기 건강검진이 4월 7일~11일 진행됩니다. 예약 링크를 통해 희망 일시를 선택해주세요.",
    author: "인사팀",
    createdAt: "2026-03-15",
    category: "일정",
    pinned: false,
    references: ["전체"],
    attachments: [{ name: "건강검진_안내문.pdf", size: "310KB" }],
  },
  {
    id: "7",
    no: 4,
    title: "점심 그룹 매칭 시스템 오픈",
    content:
      "새로운 점심 그룹 랜덤 매칭 시스템이 오픈되었습니다. 매주 월요일 자동 매칭되며, 사이드바에서 확인 가능합니다.",
    author: "개발팀",
    createdAt: "2026-03-10",
    category: "업데이트",
    pinned: false,
    references: [],
    attachments: [],
  },
  {
    id: "8",
    no: 3,
    title: "연차 사용 촉진 안내",
    content:
      "근로기준법에 따라 연차 사용이 권장됩니다. 상반기 내 최소 5일 이상 사용을 부탁드립니다.",
    author: "인사팀",
    createdAt: "2026-03-05",
    category: "공지",
    pinned: false,
    references: ["전체"],
    attachments: [],
  },
  {
    id: "9",
    no: 2,
    title: "3월 생일자 축하 이벤트",
    content:
      "3월 생일자를 축하합니다! 생일 축하 케이크는 3월 14일 오후 3시에 라운지에서 진행됩니다.",
    author: "문화위원회",
    createdAt: "2026-03-01",
    category: "일정",
    pinned: false,
    references: [],
    attachments: [],
  },
  {
    id: "10",
    no: 1,
    title: "2월 정산 완료 안내",
    content:
      "2월 식대 및 복지포인트 정산이 완료되었습니다. 마이페이지에서 상세 내역을 확인하실 수 있습니다.",
    author: "관리팀",
    createdAt: "2026-02-28",
    category: "공지",
    pinned: false,
    references: [],
    attachments: [],
  },
];

export const CATEGORY_COLORS: Record<Notice["category"], string> = {
  공지: "bg-blue-50 text-slate-600",
  일정: "bg-emerald-50 text-slate-600",
  업데이트: "bg-violet-50 text-slate-600",
};
