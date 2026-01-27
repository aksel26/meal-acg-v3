"use client";

import { useState, useCallback } from "react";
import { ScannerStatus, ReceiptScanResult, ScannerError, ScanReceiptResponse } from "@/lib/types/receipt-types";

interface UseReceiptScannerOptions {
  onSuccess?: (result: ReceiptScanResult) => void;
  onError?: (error: ScannerError) => void;
}

interface UseReceiptScannerReturn {
  status: ScannerStatus;
  result: ReceiptScanResult | null;
  error: ScannerError | null;
  scanImage: (file: File) => Promise<void>;
  reset: () => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const SUPPORTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

export function useReceiptScanner(options: UseReceiptScannerOptions = {}): UseReceiptScannerReturn {
  const { onSuccess, onError } = options;

  const [status, setStatus] = useState<ScannerStatus>("idle");
  const [result, setResult] = useState<ReceiptScanResult | null>(null);
  const [error, setError] = useState<ScannerError | null>(null);

  // 파일을 base64로 변환
  const fileToBase64 = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // data:image/jpeg;base64, 부분 제거
        const base64 = result.split(",")[1];
        if (base64) {
          resolve(base64);
        } else {
          reject(new Error("Failed to convert file to base64"));
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }, []);

  // 이미지 스캔 함수
  const scanImage = useCallback(
    async (file: File) => {
      // 파일 크기 검증
      if (file.size > MAX_FILE_SIZE) {
        const scanError: ScannerError = {
          code: "FILE_TOO_LARGE",
          message: "파일 크기가 10MB를 초과합니다.",
        };
        setError(scanError);
        setStatus("error");
        onError?.(scanError);
        return;
      }

      // 파일 형식 검증
      if (!SUPPORTED_TYPES.includes(file.type)) {
        const scanError: ScannerError = {
          code: "UNSUPPORTED_FORMAT",
          message: "지원되지 않는 이미지 형식입니다. JPEG, PNG, WebP, HEIC 형식만 지원됩니다.",
        };
        setError(scanError);
        setStatus("error");
        onError?.(scanError);
        return;
      }

      try {
        setStatus("processing");
        setError(null);
        setResult(null);

        // 파일을 base64로 변환
        const base64Image = await fileToBase64(file);

        // API 호출
        const response = await fetch("/api/scan-receipt", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            image: base64Image,
            mimeType: file.type,
          }),
        });

        const data: ScanReceiptResponse = await response.json();

        if (!response.ok || !data.success) {
          const scanError: ScannerError = {
            code: response.status === 422 ? "RECOGNITION_FAILED" : "API_ERROR",
            message: data.error || "영수증 스캔에 실패했습니다.",
          };
          setError(scanError);
          setStatus("error");
          onError?.(scanError);
          return;
        }

        if (data.data) {
          setResult(data.data);
          setStatus("success");
          onSuccess?.(data.data);
        }
      } catch (err) {
        const scanError: ScannerError = {
          code: "UNKNOWN",
          message: err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.",
        };
        setError(scanError);
        setStatus("error");
        onError?.(scanError);
      }
    },
    [fileToBase64, onSuccess, onError]
  );

  // 상태 초기화
  const reset = useCallback(() => {
    setStatus("idle");
    setResult(null);
    setError(null);
  }, []);

  return {
    status,
    result,
    error,
    scanImage,
    reset,
  };
}
