import React from "react";

interface FooterProps {
  className?: string;
  variant?: "default" | "compact";
}

function SupportMessage({ className = "" }: { className?: string }) {
  return (
    <p className={className}>
      복지 운영 관련 문의는 P&C 팀,
      <br />
      기능 오류 및 버그 관련 문의는 HR Tech팀 김현민 선임에게 문의해 주세요.
    </p>
  );
}

export function Footer({ className = "", variant = "default" }: FooterProps) {
  const currentYear = new Date().getFullYear();

  if (variant === "compact") {
    return (
      <footer className={`w-full ${className}`}>
        <div className="flex flex-col gap-3 rounded-[22px] bg-white px-4 py-3 text-[var(--ink-black)] sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--slate-gray)]">
              Support
            </p>
            <SupportMessage className="mt-1 text-sm leading-5 text-[var(--granite)]" />
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className={`w-full ${className}`}>
      <div className="overflow-hidden rounded-[28px] bg-[var(--ink-black)] text-white">
        <div className="space-y-6 px-6 py-7">
          <div className="space-y-3">
            <p className="eyebrow-label text-white/70 before:bg-[var(--signal-orange)]">Support</p>
            <h2 className="max-w-[16rem] text-[1.9rem] leading-[1.02] tracking-[-0.04em] text-white">
              운영과 버그 문의를
              <br />
              안내합니다.
            </h2>
            <SupportMessage className="max-w-[22rem] text-sm leading-6 text-white/64" />
          </div>

          <div className="divider bg-white/10" />

          <div className="flex items-center justify-between gap-4 text-xs text-white/58">
            <span>© {currentYear} ACG Welfare Service</span>
            <span className="rounded-full border border-white/12 px-3 py-1.5 text-white/72">
              KO • User
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
