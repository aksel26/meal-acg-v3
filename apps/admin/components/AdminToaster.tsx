"use client";

import { Toaster } from "sonner";

/** admin 전용 B&W 토스트 — 테두리/섀도 없이 다크 필로 대비 확보 */
export function AdminToaster() {
  return (
    <Toaster
      position="top-center"
      toastOptions={{
        className:
          "!rounded-lg !border-0 !shadow-none !bg-slate-900 !text-white",
        style: {
          padding: "14px 18px",
        },
      }}
    />
  );
}
