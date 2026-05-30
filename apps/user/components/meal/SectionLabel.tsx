interface SectionLabelProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * 이미지 디자인의 "● LABEL" 섹션 헤더.
 * 작은 점 + 대문자 letter-spacing 회색 텍스트.
 */
export function SectionLabel({ children, className = "" }: SectionLabelProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-slate-900" />
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
        {children}
      </span>
    </div>
  );
}
