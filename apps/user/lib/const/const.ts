export const mealTypeOptions = [
  {
    value: "breakfast",
    label: "조식",
    emoji: "🌅",
    color: "bg-orange-50 border-orange-200 text-orange-800",
    hoverColor: "hover:bg-orange-100",
  },
  {
    value: "lunch",
    label: "중식",
    emoji: "🍽️",
    color: "bg-blue-50 border-blue-200 text-blue-800",
    hoverColor: "hover:bg-blue-100",
  },
  {
    value: "dinner",
    label: "석식",
    emoji: "🌙",
    color: "bg-indigo-50 border-indigo-200 text-indigo-800",
    hoverColor: "hover:bg-indigo-100",
  },
];

export const attendanceOptions = [
  { value: "근무", label: "근무", icon: "/icons/onigiri.png", color: "text-green-700" },
  {
    value: "근무(개별식사 / 식사안함)",
    label: "근무(개별식사 / 식사안함)",
    icon: "/icons/onigiri.png",
    color: "text-green-700",
  },
  {
    value: "오전 반차/휴무",
    label: "오전 반차/휴무",
    icon: "/icons/clock.png",
    color: "text-orange-700",
  },
  {
    value: "오후 반차/휴무",
    label: "오후 반차/휴무",
    icon: "/icons/clock.png",
    color: "text-orange-700",
  },
  {
    value: "연차/휴무",
    label: "연차/휴무",
    icon: "/icons/holiday.png",
    color: "text-blue-700",
  },
  {
    value: "재택근무",
    label: "재택근무",
    icon: "/icons/homeOffice.png",
    color: "text-purple-700",
  },
];

// 사업자번호 목록 (예시 데이터)
export const businessNumbers = [
  { name: "남도분식", businessNumber: "122-85-56344(일반)" },
  { name: "홍수계", businessNumber: "156-85-01352(일반)" },
  { name: "꿈꾸는메밀", businessNumber: "680-88-02909(일반)" },
  { name: "퍼부어", businessNumber: "120-81-85957(일반)" },
  { name: "우미학", businessNumber: "120-81-85957(일반)" },
  { name: "니뽕내뽕", businessNumber: "488-81-01718(일반)" },
  { name: "서래함박", businessNumber: "120-81-85957(일반)" },
  { name: "신성식당", businessNumber: "627-87-02105(폐업자)" },
];
