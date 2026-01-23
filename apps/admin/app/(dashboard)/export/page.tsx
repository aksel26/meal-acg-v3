"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
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
import { Download, FileSpreadsheet } from "lucide-react";

type ExportType = "summary" | "detailed" | "raw";

export default function ExportPage() {
  const currentDate = dayjs();
  const [selectedYear, setSelectedYear] = useState(currentDate.year());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.month() + 1);
  const [exportType, setExportType] = useState<ExportType>("summary");
  const [includeFormulas, setIncludeFormulas] = useState(true);

  // Export mutation
  const exportMutation = useMutation({
    mutationFn: async () => {
      const params = new URLSearchParams({
        year: selectedYear.toString(),
        month: selectedMonth.toString(),
        type: exportType,
        formulas: includeFormulas.toString(),
      });

      const response = await fetch(`/api/export/excel?${params}`);
      if (!response.ok) throw new Error("Failed to export");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `식대정산_${selectedYear}년${selectedMonth}월_${exportType}.xlsx`;
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

  const years = Array.from({ length: 5 }, (_, i) => currentDate.year() - 2 + i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  const exportTypes: { value: ExportType; label: string; description: string }[] = [
    {
      value: "summary",
      label: "요약본",
      description: "사용자별 월별 정산 요약 (이름, 지원금, 사용금액, 잔액)",
    },
    {
      value: "detailed",
      label: "상세본",
      description: "날짜별 식대 기록 포함 (아침/점심/저녁 상세)",
    },
    {
      value: "raw",
      label: "원본 데이터",
      description: "meal_logs 테이블 전체 데이터 (가공 없이)",
    },
  ];

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>엑셀 내보내기</CardTitle>
          <CardDescription>
            식대 데이터를 엑셀 파일로 내보냅니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Date Selection */}
          <div className="space-y-2">
            <Label>기준 기간</Label>
            <div className="flex items-center gap-4">
              <Select
                value={selectedYear.toString()}
                onValueChange={(value) => setSelectedYear(parseInt(value))}
              >
                <SelectTrigger className="w-32">
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
                value={selectedMonth.toString()}
                onValueChange={(value) => setSelectedMonth(parseInt(value))}
              >
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month) => (
                    <SelectItem key={month} value={month.toString()}>
                      {month}월
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Export Type Selection */}
          <div className="space-y-3">
            <Label>내보내기 유형</Label>
            <div className="space-y-2">
              {exportTypes.map((type) => (
                <div
                  key={type.value}
                  onClick={() => setExportType(type.value)}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    exportType === type.value
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet
                      className={`h-5 w-5 ${
                        exportType === type.value
                          ? "text-blue-500"
                          : "text-gray-400"
                      }`}
                    />
                    <div>
                      <p className="font-medium">{type.label}</p>
                      <p className="text-sm text-gray-500">{type.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Options */}
          <div className="space-y-3">
            <Label>옵션</Label>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="formulas"
                checked={includeFormulas}
                onCheckedChange={(checked) => setIncludeFormulas(checked === true)}
              />
              <label
                htmlFor="formulas"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                VLOOKUP 수식 포함 (요약본만 해당)
              </label>
            </div>
            <p className="text-xs text-gray-500 ml-6">
              수식을 포함하면 설정 변경 시 자동으로 값이 재계산됩니다.
            </p>
          </div>

          {/* Export Button */}
          <div className="pt-4 border-t">
            <Button
              onClick={() => exportMutation.mutate()}
              disabled={exportMutation.isPending}
              className="w-full"
            >
              <Download className="h-4 w-4 mr-2" />
              {exportMutation.isPending ? "다운로드 중..." : "엑셀 다운로드"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Export Info */}
      <Card>
        <CardHeader>
          <CardTitle>내보내기 정보</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div>
              <h4 className="font-medium mb-1">요약본 시트 구성</h4>
              <ul className="list-disc list-inside text-gray-600 space-y-1">
                <li>Summary: 사용자별 월별 정산 (VLOOKUP 수식)</li>
                <li>Settings: 일일 식대 단가, 공휴일 목록</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-1">상세본 시트 구성</h4>
              <ul className="list-disc list-inside text-gray-600 space-y-1">
                <li>Summary: 사용자별 월별 정산</li>
                <li>Details: 날짜별 식대 기록 (아침/점심/저녁)</li>
                <li>Settings: 일일 식대 단가, 공휴일 목록</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-1">원본 데이터</h4>
              <ul className="list-disc list-inside text-gray-600 space-y-1">
                <li>RawData: meal_logs 테이블 전체 데이터</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
