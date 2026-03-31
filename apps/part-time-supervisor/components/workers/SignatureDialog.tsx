"use client";

import { useState, useEffect } from "react";
import { Download } from "lucide-react";
import { toast } from "@repo/ui/src/sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/src/dialog";

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

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-[80vw] max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>계약서</span>
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
          </DialogTitle>
        </DialogHeader>
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
      </DialogContent>
    </Dialog>
  );
}
