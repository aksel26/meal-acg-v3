"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Copy, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/src/dialog";
import { Button } from "@repo/ui/src/button";
import { Input } from "@repo/ui/src/input";

export default function ContractLinkModal({
  open,
  onOpenChange,
  jobPostingId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobPostingId: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);
  const [contractUrl, setContractUrl] = useState("");

  useEffect(() => {
    setContractUrl(`${window.location.origin}/attendance/${jobPostingId}`);
  }, [jobPostingId]);

  useEffect(() => {
    if (!open || !contractUrl) return;
    const timer = setTimeout(() => {
      if (canvasRef.current) {
        QRCode.toCanvas(canvasRef.current, contractUrl, {
          width: 256,
          margin: 2,
        });
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [open, contractUrl]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(contractUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>출석 링크 / QR</DialogTitle>
        </DialogHeader>

        <div className="flex justify-center py-2">
          <canvas ref={canvasRef} />
        </div>

        <div className="flex items-center gap-2">
          <Input readOnly value={contractUrl} className="text-xs" />
          <Button variant="outline" size="icon" onClick={handleCopy} className="shrink-0">
            {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
          </Button>
        </div>

        <p className="text-center text-xs text-slate-400">
          지원자에게 이 QR 코드를 스캔하여 출석 체크하도록 안내하세요.
        </p>
      </DialogContent>
    </Dialog>
  );
}
