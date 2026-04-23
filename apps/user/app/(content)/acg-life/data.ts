// ─── 온보딩 가이드 ───

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  items: string[];
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: "1",
    title: "첫 출근 준비",
    description: "출근 전 준비해야 할 사항들을 확인하세요.",
    items: [
      "사원증 수령 (관리팀 문의)",
      "PC / 모니터 세팅 확인",
      "사내 Wi-Fi 연결 (SSID: ACG-Office)",
      "주차 등록 신청 (해당 시)",
    ],
  },
  {
    id: "2",
    title: "사내 시스템 셋업",
    description: "업무에 필요한 시스템에 접속하고 계정을 설정하세요.",
    items: [
      "이메일 계정 활성화 (Google Workspace)",
      "Slack 워크스페이스 참여",
      "Notion / Confluence 접속 확인",
      "ACG 인트라넷 로그인 및 프로필 등록",
      "출퇴근 앱 설치 및 설정",
    ],
  },
  {
    id: "3",
    title: "조직 소개",
    description: "팀 구성과 주요 담당자를 파악하세요.",
    items: [
      "소속 팀 및 팀장 인사",
      "멘토/버디 배정 확인",
      "주요 유관부서 담당자 파악",
      "조직도 확인 (인트라넷 > 조직 관리)",
    ],
  },
  {
    id: "4",
    title: "복지 안내",
    description: "ACG에서 제공하는 복지 혜택을 확인하세요.",
    items: [
      "식대 지원 정책 확인 (인트라넷 > 식대)",
      "복지포인트 사용 방법",
      "연차/휴가 정책 확인",
      "경조사 지원 안내",
      "워크샵/워케이션 일정 확인",
    ],
  },
  {
    id: "5",
    title: "업무 시작",
    description: "본격적인 업무 시작을 위한 마지막 체크리스트입니다.",
    items: [
      "팀 회의 일정 확인 (캘린더)",
      "프로젝트 온보딩 문서 읽기",
      "개발 환경 세팅 (해당 시)",
      "첫 주 목표 설정 (팀장과 1:1)",
    ],
  },
];

// ─── 회사 소개 ───

export interface CompanySection {
  id: string;
  title: string;
  content: string;
}

export const COMPANY_SECTIONS: CompanySection[] = [
  {
    id: "mission",
    title: "미션 & 비전",
    content:
      "ACG는 '사람 중심의 기술'을 통해 기업과 구직자를 연결하며, 고용 시장의 새로운 가치를 만들어갑니다. 신뢰와 혁신을 바탕으로 모든 구성원이 성장할 수 있는 환경을 제공합니다.",
  },
  {
    id: "culture",
    title: "조직 문화",
    content:
      "자율과 책임을 기반으로 한 수평적 조직 문화를 지향합니다. 정기 워크샵, 워케이션 등을 통해 팀 간 교류를 활성화하고, 구성원의 워라밸을 중요하게 생각합니다.",
  },
  {
    id: "office",
    title: "오피스 안내",
    content:
      "본사는 서울 강남구에 위치하며, 쾌적한 업무 환경과 회의실, 휴게 공간을 갖추고 있습니다. 주차장 이용 시 사전 등록이 필요하며, 관리팀에 문의해주세요.",
  },
  {
    id: "benefits",
    title: "복리후생 요약",
    content:
      "식대 지원, 복지포인트, 경조사 지원, 연차/반차 제도, 워크샵/워케이션, 자기계발 지원금 등 다양한 복리후생을 제공합니다. 자세한 내용은 사규집 탭을 확인하세요.",
  },
];

// ─── 행사 앨범 ───

export type EventCategory = "워크샵" | "워케이션" | "워크닉" | "기타";

export interface EventAlbum {
  id: string;
  title: string;
  date: string;
  category: EventCategory;
  description: string;
  photoCount: number;
}

export const EVENT_CATEGORIES: EventCategory[] = [
  "워크샵",
  "워케이션",
  "워크닉",
  "기타",
];

export const EVENT_ALBUMS: EventAlbum[] = [
  {
    id: "1",
    title: "2026 1분기 워크샵",
    date: "2026-03-14",
    category: "워크샵",
    description: "팀빌딩 활동과 전사 미팅으로 구성된 1박 2일 워크샵",
    photoCount: 24,
  },
  {
    id: "2",
    title: "2025 겨울 워케이션",
    date: "2025-12-20",
    category: "워케이션",
    description: "제주도에서 진행된 3박 4일 워케이션",
    photoCount: 36,
  },
  {
    id: "3",
    title: "2025 가을 워크닉",
    date: "2025-10-11",
    category: "워크닉",
    description: "한강 공원에서 진행된 팀 워크닉",
    photoCount: 18,
  },
  {
    id: "4",
    title: "2025 여름 워케이션",
    date: "2025-07-18",
    category: "워케이션",
    description: "강릉에서 진행된 여름 워케이션",
    photoCount: 42,
  },
  {
    id: "5",
    title: "2025 상반기 워크샵",
    date: "2025-06-06",
    category: "워크샵",
    description: "신규 입사자 환영 및 상반기 회고 워크샵",
    photoCount: 20,
  },
  {
    id: "6",
    title: "2025 송년회",
    date: "2025-12-27",
    category: "기타",
    description: "한 해를 마무리하는 송년회 행사",
    photoCount: 15,
  },
];

export const CATEGORY_COLORS: Record<EventCategory, string> = {
  워크샵: "bg-blue-50 text-blue-600",
  워케이션: "bg-emerald-50 text-emerald-600",
  워크닉: "bg-amber-50 text-amber-600",
  기타: "bg-slate-100 text-slate-600",
};

// ─── 사규집 ───

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
          "입사 1년 미만: 매월 1일 발생. 1년 이상: 15일 기본 부여, 3년마다 1일 추가 (최대 25일). 미사용 연차는 수당으로 정산됩니다.",
        updatedAt: "2026-01-01",
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
