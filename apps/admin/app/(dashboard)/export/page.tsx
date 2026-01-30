"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import dayjs from "dayjs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/src/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/src/select";
import { Button } from "@repo/ui/src/button";
import { toast } from "sonner";
import {
  Download,
  FileSpreadsheet,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { queryKeys } from "@/lib/query-keys";
import type { Member } from "@/lib/supabase/types";
import { cn } from "@repo/ui/lib/utils";

type HalfYear = "H1" | "H2"; // H1: 상반기 (1-6월), H2: 하반기 (7-12월)

export default function ExportPage() {
  const currentDate = dayjs();
  const [selectedYear, setSelectedYear] = useState(currentDate.year());
  // 현재 월 기준으로 상반기/하반기 자동 선택
  const [selectedHalf, setSelectedHalf] = useState<HalfYear>(
    currentDate.month() < 6 ? "H1" : "H2"
  );
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);

  // 멤버 목록 조회
  const { data: members = [] } = useQuery<Member[]>({
    queryKey: queryKeys.members.all,
    queryFn: async () => {
      const response = await fetch("/api/members");
      if (!response.ok) throw new Error("Failed to fetch members");
      return response.json();
    },
  });

  // 반기 라벨
  const halfLabel = selectedHalf === "H1" ? "상반기" : "하반기";

  // 멤버 내보내기 (1명: xlsx, 2명 이상: ZIP)
  const exportMutation = useMutation({
    mutationFn: async (memberIds: string[]) => {
      const params = new URLSearchParams({
        year: selectedYear.toString(),
        half: selectedHalf,
        memberIds: memberIds.join(","),
      });

      const response = await fetch(`/api/export/members-bulk?${params}`);
      if (!response.ok) throw new Error("Failed to export");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      // 1명이면 xlsx, 2명 이상이면 zip
      if (memberIds.length === 1) {
        const member = members.find((m) => m.id === memberIds[0]);
        a.download = member ? `${member.full_name}.xlsx` : "export.xlsx";
      } else {
        a.download = `식대내역_${selectedYear}년_${halfLabel}.zip`;
      }

      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
    onSuccess: () => {
      const message = selectedMemberIds.length === 1
        ? "엑셀 파일이 다운로드되었습니다."
        : "ZIP 파일이 다운로드되었습니다.";
      toast.success(message);
    },
    onError: () => {
      toast.error("내보내기 중 오류가 발생했습니다.");
    },
  });

  const handleExport = () => {
    if (selectedMemberIds.length === 0) {
      toast.error("내보낼 멤버를 선택해주세요.");
      return;
    }
    exportMutation.mutate(selectedMemberIds);
  };

  const toggleMemberSelection = (memberId: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  };

  const selectAllMembers = () => {
    setSelectedMemberIds(members.map((m) => m.id));
  };

  const clearSelection = () => {
    setSelectedMemberIds([]);
  };

  const years = Array.from({ length: 5 }, (_, i) => currentDate.year() - 2 + i);

  const isLoading = exportMutation.isPending;

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">엑셀 내보내기</h1>
        <p className="text-sm text-gray-500 mt-1">
          식대 데이터를 엑셀 파일로 내보냅니다. 원본 양식과 동일한 형식으로 생성됩니다.
        </p>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* 왼쪽: 설정 및 내보내기 정보 */}
        <div className="col-span-5 space-y-4">
          {/* 기간 선택 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">기준 기간</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Select
                  value={selectedYear.toString()}
                  onValueChange={(value) => setSelectedYear(parseInt(value))}
                >
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}년
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={selectedHalf}
                  onValueChange={(value) => setSelectedHalf(value as HalfYear)}
                >
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="H1">상반기 (1~6월)</SelectItem>
                    <SelectItem value="H2">하반기 (7~12월)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* 내보내기 정보 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">내보내기 정보</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-3 bg-sky-50 rounded-lg">
                  <FileSpreadsheet className="h-6 w-6 text-sky-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sky-900 text-sm">
                      원본 양식과 동일한 형식
                    </p>
                    <p className="text-xs text-sky-700">
                      Import에 사용한 엑셀 파일과 동일한 구조로 내보냅니다.
                    </p>
                  </div>
                </div>

                <div className="text-sm text-gray-600">
                  <p className="font-medium text-gray-900 mb-1">생성되는 시트</p>
                  <ul className="space-y-1 text-xs">
                    <li>• <span className="font-medium">통계:</span> 기간별 요약 정보</li>
                    <li>• <span className="font-medium">내역:</span> 날짜별 조식/중식/석식 데이터</li>
                  </ul>
                </div>

                <div className="text-xs text-gray-500">
                  <p>1명 선택: 엑셀 파일(.xlsx)로 다운로드</p>
                  <p>2명 이상 선택: ZIP 파일로 다운로드</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 내보내기 버튼 */}
          <Button
            onClick={handleExport}
            disabled={isLoading || selectedMemberIds.length === 0}
            className="w-full"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                내보내기 중...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                {selectedMemberIds.length === 0
                  ? "멤버를 선택하세요"
                  : selectedMemberIds.length === 1
                    ? "엑셀 다운로드"
                    : `ZIP 다운로드 (${selectedMemberIds.length}명)`}
              </>
            )}
          </Button>
        </div>

        {/* 오른쪽: 멤버 선택 */}
        <div className="col-span-7">
          <Card className="h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">멤버 선택</CardTitle>
                  <CardDescription>
                    내보낼 멤버를 선택하세요 ({selectedMemberIds.length}/{members.length}명 선택)
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={selectAllMembers}>
                    전체 선택
                  </Button>
                  <Button variant="outline" size="sm" onClick={clearSelection}>
                    선택 해제
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2 max-h-[400px] overflow-y-auto">
                {members.map((member) => {
                  const isSelected = selectedMemberIds.includes(member.id);
                  return (
                    <div
                      key={member.id}
                      onClick={() => toggleMemberSelection(member.id)}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all",
                        isSelected
                          ? "border-amber-500 bg-amber-50"
                          : "border-gray-200 hover:border-gray-300"
                      )}
                    >
                      {isSelected ? (
                        <CheckCircle2 className="h-4 w-4 text-amber-600 flex-shrink-0" />
                      ) : (
                        <div className="h-4 w-4 rounded-full border border-gray-300 flex-shrink-0" />
                      )}
                      <span className="text-sm truncate">{member.full_name}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
