"use client";

import type { ReactNode } from "react";

interface StateBlockProps {
  /** 위쪽 그림(아이콘·이미지). 없으면 글자만 보여 준다 */
  icon?: ReactNode;
  title: string;
  description?: string;
  /** 다음에 할 행동. 오류에는 보통 "다시 시도"를 넘긴다 */
  action?: { label: string; onClick: () => void };
  className?: string;
}

/**
 * 빈 화면과 불러오기 실패 화면에 함께 쓰는 블록.
 * 무엇이 없는지(또는 무엇이 실패했는지)와 다음에 할 일을 한곳에서 같은 모양으로 보여 준다.
 */
export default function StateBlock({ icon, title, description, action, className = "" }: StateBlockProps) {
  return (
    <div className={`flex flex-col items-center justify-center px-4 py-8 text-center ${className}`}>
      {icon && <div className="mb-3">{icon}</div>}
      <p className="text-sm font-medium text-[var(--ink-black)]">{title}</p>
      {description && <p className="mt-1 text-xs text-[var(--slate-gray)]">{description}</p>}
      {action && (
        <button type="button" onClick={action.onClick} className="btn-secondary mt-4">
          {action.label}
        </button>
      )}
    </div>
  );
}
