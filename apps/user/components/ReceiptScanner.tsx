"use client";

import { useRef } from "react";
import { Camera, ImageIcon, Check, RotateCcw, Loader2 } from "@repo/ui/icons";
import { Button } from "@repo/ui/src/button";
import { useReceiptScanner } from "@/hooks/useReceiptScanner";
import { ReceiptScanResult } from "@/lib/types/receipt-types";

interface ReceiptScannerProps {
  onScanComplete: (result: ReceiptScanResult) => void;
  className?: string;
}

export function ReceiptScanner({ onScanComplete, className = "" }: ReceiptScannerProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const { status, result, error, scanImage, reset } = useReceiptScanner({
    onSuccess: onScanComplete,
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await scanImage(file);
    }
    e.target.value = "";
  };

  const handleCameraClick = () => {
    cameraInputRef.current?.click();
  };

  const handleGalleryClick = () => {
    galleryInputRef.current?.click();
  };

  return (
    <div className={`${className}`}>
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileSelect} className="hidden" />
      <input ref={galleryInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />

      {/* Idle state */}
      {status === "idle" && (
        <div className="p-[1px] rounded-lg bg-[var(--whisper-cream)]">
          <div className="flex gap-2 p-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCameraClick}
              className="flex-1 h-9 text-xs hover:bg-[var(--whisper-cream)]"
            >
              <Camera className="w-4 h-4 mr-1.5" />
              촬영
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleGalleryClick}
              className="flex-1 h-9 text-xs hover:bg-[var(--whisper-cream)]"
            >
              <ImageIcon className="w-4 h-4 mr-1.5" />
              갤러리
            </Button>
          </div>
        </div>
      )}

      {/* Processing state */}
      {status === "processing" && (
        <div className="flex items-center justify-center gap-2 p-3 bg-[var(--whisper-cream)] rounded-lg">
          <Loader2 className="h-4 w-4 animate-spin text-[var(--slate-gray)]" />
          <span className="text-xs text-[var(--granite)]">영수증 분석 중...</span>
        </div>
      )}

      {/* Success state */}
      {status === "success" && result && (
        <div className="flex items-center justify-between p-3 bg-[var(--whisper-cream)] rounded-lg">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-[var(--success-text)]" />
            <div className="text-xs">
              <span className="text-[var(--success-text)] font-medium">인식 완료</span>
              {result.storeName && <span className="text-[var(--success-text)] ml-2">{result.storeName}</span>}
              {result.totalAmount > 0 && <span className="text-[var(--success-text)] ml-1">/ {result.totalAmount.toLocaleString()}원</span>}
            </div>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={reset} className="h-7 w-7 p-0 text-[var(--success-text)] hover:text-[var(--success-text)] hover:bg-white">
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}

      {/* Error state */}
      {status === "error" && error && (
        <div className="p-3 bg-[var(--whisper-cream)] rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[var(--danger-text)] font-medium">인식 실패</span>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCameraClick}
              className="flex-1 h-8 text-xs text-[var(--danger-text)] hover:bg-[var(--whisper-cream)]"
            >
              <Camera className="w-3.5 h-3.5 mr-1" />
              다시 촬영
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleGalleryClick}
              className="flex-1 h-8 text-xs text-[var(--danger-text)] hover:bg-[var(--whisper-cream)]"
            >
              <ImageIcon className="w-3.5 h-3.5 mr-1" />
              다시 선택
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
