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

// ─── 사규집 (공용 모듈로 이동, 화면 호환용 re-export) ───

export {
  REGULATION_CATEGORIES,
  type Regulation,
  type RegulationCategory,
} from "@/lib/regulations";
