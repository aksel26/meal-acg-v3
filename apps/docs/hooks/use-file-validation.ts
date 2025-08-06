import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

interface FileValidationData {
  semesterInfo: {
    semester: "상반기" | "하반기";
    folderName: string;
    currentYear: number;
  };
  folderPath: string;
  files: Array<{
    name: string;
    fullPath: string;
    size: string;
    contentType: string;
    updated: string;
  }>;
  totalFiles: number;
}

interface FileValidationResponse {
  success: boolean;
  data: FileValidationData;
}

async function fetchFileValidation(userName: string, month: number, year: number): Promise<FileValidationData> {
  if (!userName) {
    throw new Error("User name is required");
  }

  const response = await fetch(`/api/files?name=${encodeURIComponent(userName)}&month=${month}&year=${year}`);

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.details || errorData.error || "파일 검증 실패");
  }

  const result: FileValidationResponse = await response.json();
  return result.data;
}

export function useFileValidation(userName: string, month: number, year: number) {
  return useQuery({
    queryKey: queryKeys.fileValidation.byUserAndMonth(userName, month, year),
    queryFn: () => fetchFileValidation(userName, month, year),
    enabled: !!userName, // userName이 있을 때만 쿼리 실행
    staleTime: 10 * 60 * 1000, // 10분간 fresh 상태 유지 (파일 구조는 자주 변경되지 않음)
    gcTime: 30 * 60 * 1000, // 30분간 캐시 유지
    retry: 2, // 파일 검증은 중요하므로 재시도 횟수 증가
  });
}