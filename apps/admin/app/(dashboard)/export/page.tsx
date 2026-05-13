"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { toast } from "@repo/ui/src/sonner";
import { Download, FileSpreadsheet, CheckCircle2 } from "lucide-react";
import { queryKeys } from "@/lib/query-keys";
import type { Member } from "@/lib/supabase/types";
import { cn } from "@repo/ui/lib/utils";
import { ExportProgressDialog } from "@/components/ExportProgressDialog";

type HalfYear = "H1" | "H2"; // H1: 상반기 (1-6월), H2: 하반기 (7-12월)

export default function ExportPage() {
  const currentDate = dayjs();
  const [selectedYear, setSelectedYear] = useState(currentDate.year());
  // 현재 월 기준으로 상반기/하반기 자동 선택
  const [selectedHalf, setSelectedHalf] = useState<HalfYear>(
    currentDate.month() < 6 ? "H1" : "H2",
  );
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

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

  const handleExport = () => {
    if (selectedMemberIds.length === 0) {
      toast.error("내보낼 멤버를 선택해주세요.");
      return;
    }
    setExportDialogOpen(true);
  };

  const toggleMemberSelection = (memberId: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId],
    );
  };

  const selectAllMembers = () => {
    setSelectedMemberIds(members.map((m) => m.id));
  };

  const clearSelection = () => {
    setSelectedMemberIds([]);
  };

  const years = Array.from({ length: 5 }, (_, i) => currentDate.year() - 2 + i);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-12 gap-6">
        {/* 왼쪽: 설정 및 내보내기 정보 */}
        <div className="col-span-5 space-y-4">
          {/* 기간 선택 */}
          <Card className="admin-card border border-slate-200 shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">기준 기간</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Select
                  value={selectedYear.toString()}
                  onValueChange={(value) => setSelectedYear(parseInt(value))}
                >
                  <SelectTrigger className="h-10 w-28">
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
                  <SelectTrigger className="h-10 w-38">
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
          <Card className="admin-card border border-slate-200 shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">내보내기 정보</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-3 bg-sky-50 rounded-md">
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
                  <p className="font-medium text-gray-900 mb-1">
                    생성되는 시트
                  </p>
                  <ul className="space-y-1 text-xs">
                    <li>
                      • <span className="font-medium">통계:</span> 기간별 요약
                      정보
                    </li>
                    <li>
                      • <span className="font-medium">내역:</span> 날짜별
                      조식/중식/석식 데이터
                    </li>
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
            disabled={selectedMemberIds.length === 0}
            className="w-full"
            size="lg"
          >
            <Download className="h-4 w-4 mr-2" />
            {selectedMemberIds.length === 0
              ? "멤버를 선택하세요"
              : selectedMemberIds.length === 1
                ? "엑셀 다운로드"
                : `다운로드 (${selectedMemberIds.length}명)`}
          </Button>
        </div>

        {/* 오른쪽: 멤버 선택 */}
        <div className="col-span-7">
          <Card className="admin-card border border-slate-200 shadow-none h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">멤버 선택</CardTitle>
                  <CardDescription>
                    내보낼 멤버를 선택하세요 ({selectedMemberIds.length}/
                    {members.length}명 선택)
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={selectAllMembers}
                  >
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
                        "flex items-center gap-2 p-2 rounded-md border cursor-pointer transition-all",
                        isSelected
                          ? "border-[#1d1d1f] bg-[#1d1d1f]/10"
                          : "border-gray-200 hover:border-gray-300",
                      )}
                    >
                      {isSelected ? (
                        <CheckCircle2 className="h-4 w-4 text-[#1d1d1f] flex-shrink-0" />
                      ) : (
                        <div className="h-4 w-4 rounded-full border border-gray-300 flex-shrink-0" />
                      )}
                      <span className="text-sm truncate">
                        {member.full_name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <ExportProgressDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        members={members}
        selectedMemberIds={selectedMemberIds}
        year={selectedYear}
        half={selectedHalf}
      />
    </div>
  );
}
