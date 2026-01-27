// 영수증 스캔 결과 타입
export interface ReceiptScanResult {
  storeName: string;
  date: string; // YYYY-MM-DD 형식
  totalAmount: number;
  confidence: number; // 0-1 사이의 인식 신뢰도
}

// API 요청 타입
export interface ScanReceiptRequest {
  image: string; // base64 인코딩된 이미지
  mimeType: string; // image/jpeg, image/png 등
}

// API 응답 타입
export interface ScanReceiptResponse {
  success: boolean;
  data?: ReceiptScanResult;
  error?: string;
}

// 스캐너 상태 타입
export type ScannerStatus = "idle" | "capturing" | "processing" | "success" | "error";

// 스캐너 에러 타입
export interface ScannerError {
  code: "FILE_TOO_LARGE" | "UNSUPPORTED_FORMAT" | "API_ERROR" | "RECOGNITION_FAILED" | "UNKNOWN";
  message: string;
}
