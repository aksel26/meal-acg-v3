"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Download } from "lucide-react";
import { toast } from "@repo/ui/src/sonner";

export default function ContractImageDialog({
  contractId,
  open,
  onClose,
}: {
  contractId: string;
  open: boolean;
  onClose: () => void;
}) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !contractId) return;
    setLoading(true);
    setSignedUrl(null);
    fetch(`/api/contracts/${contractId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed");
        return res.json();
      })
      .then((data) => setSignedUrl(data.signedUrl))
      .catch(() => toast.error("계약서 이미지를 불러올 수 없습니다."))
      .finally(() => setLoading(false));
  }, [open, contractId]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={onClose}
    >
      <div
        className="relative max-h-[80vh] max-w-[80vw] overflow-auto rounded-xl bg-white p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-sm font-semibold">계약서</h4>
          <div className="flex items-center gap-1">
            {signedUrl && (
              <a
                href={signedUrl}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <Download size={16} />
              </a>
            )}
            <button
              onClick={onClose}
              className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X size={16} />
            </button>
          </div>
        </div>
        {loading ? (
          <div className="flex h-40 w-60 items-center justify-center text-sm text-slate-400">
            로딩 중...
          </div>
        ) : signedUrl ? (
          <img
            src={signedUrl}
            alt="계약서"
            className="max-h-[70vh] rounded-lg"
          />
        ) : (
          <div className="flex h-40 w-60 items-center justify-center text-sm text-slate-400">
            이미지를 불러올 수 없습니다.
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
