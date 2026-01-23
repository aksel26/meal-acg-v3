"use client";

import { useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Camera, ImageIcon, Check, AlertCircle, RotateCcw, Receipt } from "@repo/ui/icons";
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
    // input 초기화 (같은 파일 재선택 가능하도록)
    e.target.value = "";
  };

  const handleCameraClick = () => {
    cameraInputRef.current?.click();
  };

  const handleGalleryClick = () => {
    galleryInputRef.current?.click();
  };

  return (
    <div className={`relative ${className}`}>
      {/* Hidden file inputs */}
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileSelect} className="hidden" />
      <input ref={galleryInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />

      <AnimatePresence mode="wait">
        {/* Idle state - 버튼 표시 */}
        {status === "idle" && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="flex gap-2"
          >
            <Button type="button" variant="outline" size="sm" onClick={handleCameraClick} className="flex-1 gap-1.5 text-xs h-8 border-gray-300 hover:border-blue-400 hover:bg-blue-50">
              <Camera className="w-3.5 h-3.5" />
              촬영
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={handleGalleryClick} className="flex-1 gap-1.5 text-xs h-8 border-gray-300 hover:border-blue-400 hover:bg-blue-50">
              <ImageIcon className="w-3.5 h-3.5" />
              갤러리
            </Button>
          </motion.div>
        )}

        {/* Processing state - 스캔 애니메이션 */}
        {status === "processing" && (
          <motion.div
            key="processing"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="relative bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200"
          >
            {/* 스캔 라인 애니메이션 */}
            <div className="relative h-16 overflow-hidden rounded-md bg-white/50">
              <motion.div
                className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-blue-500 to-transparent"
                animate={{
                  top: ["0%", "100%", "0%"],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <Receipt className="w-8 h-8 text-blue-400 opacity-50" />
              </div>
            </div>

            {/* 로딩 dots */}
            <div className="flex items-center justify-center gap-1 mt-3">
              <span className="text-xs text-blue-600 font-medium">영수증 분석 중</span>
              <div className="flex gap-0.5">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-1 h-1 bg-blue-500 rounded-full"
                    animate={{
                      y: [0, -4, 0],
                    }}
                    transition={{
                      duration: 0.5,
                      repeat: Infinity,
                      delay: i * 0.15,
                    }}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Success state - 결과 표시 */}
        {status === "success" && result && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3, type: "spring", stiffness: 300, damping: 25 }}
            className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-3 border border-green-200"
          >
            <div className="flex items-start gap-2">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: "spring", stiffness: 400, damping: 15 }}
                className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
              >
                <Check className="w-3 h-3 text-white" />
              </motion.div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-green-800 mb-1">인식 완료</p>
                <div className="space-y-0.5 text-[11px] text-green-700">
                  {result.storeName && (
                    <p className="truncate">
                      <span className="text-green-600">식당:</span> {result.storeName}
                    </p>
                  )}
                  {result.totalAmount > 0 && (
                    <p>
                      <span className="text-green-600">금액:</span> {result.totalAmount.toLocaleString()}원
                    </p>
                  )}
                  {result.date && (
                    <p>
                      <span className="text-green-600">날짜:</span> {result.date}
                    </p>
                  )}
                </div>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={reset} className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-100">
                <RotateCcw className="w-3.5 h-3.5" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* Error state - 에러 표시 */}
        {status === "error" && error && (
          <motion.div
            key="error"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="bg-gradient-to-br from-red-50 to-orange-50 rounded-lg p-3 border border-red-200"
          >
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-medium text-red-800 mb-1">인식 실패</p>
                <p className="text-[11px] text-red-600">{error.message}</p>
              </div>
            </div>
            <div className="flex gap-2 mt-2">
              <Button type="button" variant="outline" size="sm" onClick={handleCameraClick} className="flex-1 gap-1 text-[11px] h-7 border-red-200 text-red-600 hover:bg-red-50">
                <Camera className="w-3 h-3" />
                다시 촬영
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={handleGalleryClick} className="flex-1 gap-1 text-[11px] h-7 border-red-200 text-red-600 hover:bg-red-50">
                <ImageIcon className="w-3 h-3" />
                다시 선택
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
