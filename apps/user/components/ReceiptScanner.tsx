"use client";

import { useRef } from "react";
import { Camera, ImageIcon, Check, RotateCcw } from "@repo/ui/icons";
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
        <div className="p-[1px] rounded-lg bg-gradient-to-r from-blue-100 via-purple-100 to-pink-100">
          <div className="flex gap-2 p-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCameraClick}
              className="flex-1 h-9 text-xs border-gray-200 hover:bg-gray-50"
            >
              <Camera className="w-4 h-4 mr-1.5" />
              촬영
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleGalleryClick}
              className="flex-1 h-9 text-xs border-gray-200 hover:bg-gray-50"
            >
              <ImageIcon className="w-4 h-4 mr-1.5" />
              갤러리
            </Button>
          </div>
        </div>
      )}

      {/* Processing state */}
      {status === "processing" && (
        <div className="flex items-center justify-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-transparent"></div>
          <span className="text-xs text-gray-600">영수증 분석 중...</span>
        </div>
      )}

      {/* Success state */}
      {status === "success" && result && (
        <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-green-600" />
            <div className="text-xs">
              <span className="text-green-700 font-medium">인식 완료</span>
              {result.storeName && <span className="text-green-600 ml-2">{result.storeName}</span>}
              {result.totalAmount > 0 && <span className="text-green-600 ml-1">/ {result.totalAmount.toLocaleString()}원</span>}
            </div>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={reset} className="h-7 w-7 p-0 text-green-600 hover:text-green-700 hover:bg-green-100">
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}

      {/* Error state */}
      {status === "error" && error && (
        <div className="p-3 bg-red-50 rounded-lg border border-red-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-red-600 font-medium">인식 실패</span>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCameraClick}
              className="flex-1 h-8 text-xs border-red-200 text-red-600 hover:bg-red-100"
            >
              <Camera className="w-3.5 h-3.5 mr-1" />
              다시 촬영
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleGalleryClick}
              className="flex-1 h-8 text-xs border-red-200 text-red-600 hover:bg-red-100"
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
