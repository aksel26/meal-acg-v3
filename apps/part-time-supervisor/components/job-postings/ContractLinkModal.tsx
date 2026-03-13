"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { X, Copy, Check } from "lucide-react";

export default function ContractLinkModal({
  jobPostingId,
  onClose,
}: {
  jobPostingId: string;
  onClose: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);
  const contractUrl = `${window.location.origin}/attendance/${jobPostingId}`;

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, contractUrl, {
        width: 256,
        margin: 2,
      });
    }
  }, [contractUrl]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(contractUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">출석 링크 / QR</h3>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        <div className="mb-5 flex justify-center">
          <canvas ref={canvasRef} />
        </div>

        <div className="mb-4 flex items-center gap-2 rounded-lg border bg-slate-50 px-3 py-2">
          <span className="min-w-0 flex-1 truncate text-xs text-slate-600">{contractUrl}</span>
          <button
            onClick={handleCopy}
            className="shrink-0 rounded-md p-1.5 hover:bg-slate-200"
          >
            {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
          </button>
        </div>

        <p className="text-center text-xs text-slate-400">
          지원자에게 이 QR 코드를 스캔하여 출석 체크하도록 안내하세요.
        </p>
      </div>
    </div>
  );
}
