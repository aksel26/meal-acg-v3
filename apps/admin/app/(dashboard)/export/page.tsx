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
import { Label } from "@repo/ui/src/label";
import { Checkbox } from "@repo/ui/src/checkbox";
import { toast } from "sonner";
import {
  Download,
  FileSpreadsheet,
  Users,
  User,
  Package,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { queryKeys } from "@/lib/query-keys";
import type { Member } from "@/lib/supabase/types";
import { cn } from "@repo/ui/lib/utils";

type ExportMode = "individual" | "selected" | "all";
type HalfYear = "H1" | "H2"; // H1: 상반기 (1-6월), H2: 하반기 (7-12월)

export default function ExportPage() {
  const currentDate = dayjs();
  const [selectedYear, setSelectedYear] = useState(currentDate.year());
  // 현재 월 기준으로 상반기/하반기 자동 선택
  const [selectedHalf, setSelectedHalf] = useState<HalfYear>(
    currentDate.month() < 6 ? "H1" : "H2"
  );
  const [exportMode, setExportMode] = useState<ExportMode>("individual");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [singleMemberId, setSingleMemberId] = useState<string>("");

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

  // 개별 멤버 내보내기
  const exportSingleMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const params = new URLSearchParams({
        year: selectedYear.toString(),
        half: selectedHalf,
        memberId,
      });

      const response = await fetch(`/api/export/member?${params}`);
      if (!response.ok) throw new Error("Failed to export");

      const blob = await response.blob();
      const member = members.find((m) => m.id === memberId);
      const fileName = member ? `${member.full_name}_${selectedYear}${halfLabel}.xlsx` : "export.xlsx";

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
    onSuccess: () => {
      toast.success("엑셀 파일이 다운로드되었습니다.");
    },
    onError: () => {
      toast.error("엑셀 내보내기 중 오류가 발생했습니다.");
    },
  });

  // 전체/선택 멤버 일괄 내보내기 (ZIP)
  const exportBulkMutation = useMutation({
    mutationFn: async (memberIds?: string[]) => {
      const params = new URLSearchParams({
        year: selectedYear.toString(),
        half: selectedHalf,
      });

      if (memberIds && memberIds.length > 0) {
        params.set("memberIds", memberIds.join(","));
      }

      const response = await fetch(`/api/export/members-bulk?${params}`);
      if (!response.ok) throw new Error("Failed to export");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `식대내역_${selectedYear}년_${halfLabel}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
    onSuccess: () => {
      toast.success("ZIP 파일이 다운로드되었습니다.");
    },
    onError: () => {
      toast.error("일괄 내보내기 중 오류가 발생했습니다.");
    },
  });

  const handleExport = () => {
    if (exportMode === "individual") {
      if (!singleMemberId) {
        toast.error("멤버를 선택해주세요.");
        return;
      }
      exportSingleMutation.mutate(singleMemberId);
    } else if (exportMode === "selected") {
      if (selectedMemberIds.length === 0) {
        toast.error("내보낼 멤버를 선택해주세요.");
        return;
      }
      exportBulkMutation.mutate(selectedMemberIds);
    } else {
      exportBulkMutation.mutate(undefined);
    }
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

  const isLoading = exportSingleMutation.isPending || exportBulkMutation.isPending;

  const exportModes = [
    {
      value: "individual" as const,
      label: "개별 내보내기",
      description: "선택한 한 명의 데이터를 엑셀 파일로 내보냅니다.",
      icon: User,
    },
    {
      value: "selected" as const,
      label: "선택 내보내기",
      description: "선택한 여러 명의 데이터를 ZIP 파일로 내보냅니다.",
      icon: Users,
    },
    {
      value: "all" as const,
      label: "전체 내보내기",
      description: "모든 멤버의 데이터를 ZIP 파일로 내보냅니다.",
      icon: Package,
    },
  ];

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
        {/* 왼쪽: 설정 */}
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

          {/* 내보내기 모드 선택 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">내보내기 유형</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {exportModes.map((mode) => (
                <div
                  key={mode.value}
                  onClick={() => setExportMode(mode.value)}
                  className={cn(
                    "p-3 border rounded-lg cursor-pointer transition-all",
                    exportMode === mode.value
                      ? "border-amber-500 bg-amber-50"
                      : "border-gray-200 hover:border-gray-300"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <mode.icon
                      className={cn(
                        "h-5 w-5",
                        exportMode === mode.value
                          ? "text-amber-600"
                          : "text-gray-400"
                      )}
                    />
                    <div>
                      <p className="font-medium text-sm">{mode.label}</p>
                      <p className="text-xs text-gray-500">{mode.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* 개별 선택 (individual 모드) */}
          {exportMode === "individual" && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">멤버 선택</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={singleMemberId} onValueChange={setSingleMemberId}>
                  <SelectTrigger>
                    <SelectValue placeholder="멤버를 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {members.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          )}

          {/* 내보내기 버튼 */}
          <Button
            onClick={handleExport}
            disabled={isLoading}
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
                {exportMode === "individual"
                  ? "엑셀 다운로드"
                  : "ZIP 다운로드"}
              </>
            )}
          </Button>
        </div>

        {/* 오른쪽: 멤버 목록 (selected 모드) */}
        <div className="col-span-7">
          {exportMode === "selected" ? (
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
          ) : exportMode === "all" ? (
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="text-base">전체 내보내기 안내</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 bg-amber-50 rounded-lg">
                    <Package className="h-10 w-10 text-amber-600" />
                    <div>
                      <p className="font-medium text-amber-900">
                        {members.length}명의 데이터를 내보냅니다
                      </p>
                      <p className="text-sm text-amber-700">
                        모든 멤버의 {selectedYear}년 {halfLabel} 데이터가 포함된 ZIP 파일이 생성됩니다.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">포함되는 멤버 목록</Label>
                    <div className="max-h-[300px] overflow-y-auto border rounded-lg p-3">
                      <div className="flex flex-wrap gap-1">
                        {members.map((member) => (
                          <span
                            key={member.id}
                            className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-700"
                          >
                            {member.full_name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="text-base">내보내기 정보</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-4 bg-sky-50 rounded-lg">
                    <FileSpreadsheet className="h-8 w-8 text-sky-600 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-sky-900">
                        원본 양식과 동일한 형식
                      </p>
                      <p className="text-sm text-sky-700">
                        Import에 사용한 엑셀 파일과 동일한 구조로 내보냅니다.
                      </p>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">생성되는 시트</Label>
                    <ul className="mt-2 space-y-2 text-sm text-gray-600">
                      <li className="flex items-start gap-2">
                        <span className="font-medium text-gray-900">통계:</span>
                        기간, 이름 등 요약 정보
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-medium text-gray-900">내역:</span>
                        날짜별 조식/중식/석식 데이터
                      </li>
                    </ul>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">컬럼 구조</Label>
                    <ul className="mt-2 space-y-1 text-sm text-gray-600">
                      <li>• 연도, 월, 일, 요일, 업무일 구분</li>
                      <li>• 근태 상태</li>
                      <li>• 중식: 상호명, 금액, 비고</li>
                      <li>• 석식: 상호명, 금액, 비고</li>
                      <li>• 조식: 상호명, 금액, 비고</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
