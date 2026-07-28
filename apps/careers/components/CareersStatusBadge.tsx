import { Badge } from "@repo/ui/src/badge";

const labels: Record<string, string> = {
  draft: "초안",
  open: "게시 중",
  closed: "마감",
  active: "진행 중",
  separated: "별도 관리",
  completed: "완료",
  hired: "합격",
  rejected: "불합격",
  withdrawn: "지원 철회",
  neutral: "진행",
};

export function CareersStatusBadge({ value }: { value: string | null }) {
  const tone =
    value === "open" ||
    value === "active" ||
    value === "pass" ||
    value === "hired"
      ? "border-[#1d1d1f] bg-[#1d1d1f] text-white"
      : value === "fail" ||
          value === "rejected" ||
          value === "separated" ||
          value === "withdrawn"
        ? "border-[#d1d1d6] bg-white text-[#3a3a3c]"
        : "border-transparent bg-[#f0f0f2] text-[#636366]";

  return (
    <Badge
      variant="outline"
      className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${tone}`}
    >
      {value ? labels[value] || value : "미지정"}
    </Badge>
  );
}
