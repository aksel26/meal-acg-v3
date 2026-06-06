"use client";

import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useDropzone } from "react-dropzone";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/src/card";
import { Button } from "@repo/ui/src/button";
import { Checkbox } from "@repo/ui/src/checkbox";
import { Label } from "@repo/ui/src/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/src/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@repo/ui/src/dialog";
import { toast } from "@repo/ui/src/sonner";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Trash2,
  Play,
  Loader2,
} from "lucide-react";
import { queryKeys } from "@/lib/query-keys";
import {
  type MealRecord,
  type ParseResult,
} from "@/lib/excel-parser";
import type { Member } from "@/lib/supabase/types";

interface FileUploadState extends ParseResult {
  file: File;
  matchedMember: Member | null;
  status: "pending" | "importing" | "success" | "error";
  result?: {
    inserted: number;
    updated: number;
    skipped: number;
    errors: { date: string; message: string }[];
  };
}

export default function ImportPage() {
  const queryClient = useQueryClient();
  const [uploadedFiles, setUploadedFiles] = useState<FileUploadState[]>([]);
  const [overwrite, setOverwrite] = useState(false);
  const [selectedPreview, setSelectedPreview] = useState<string | null>(null);
  const [isResultOpen, setIsResultOpen] = useState(false);
  const [importResults, setImportResults] = useState<
    { fileName: string; inserted: number; updated: number; skipped: number }[]
  >([]);

  // 멤버 목록 조회
  const { data: members = [], isLoading: membersLoading } = useQuery<Member[]>({
    queryKey: queryKeys.members.all,
    queryFn: async () => {
      const response = await fetch("/api/members");
      if (!response.ok) throw new Error("Failed to fetch members");
      return response.json();
    },
  });

  // Import mutation
  const importMutation = useMutation({
    mutationFn: async (data: {
      memberId: string;
      records: MealRecord[];
      overwrite: boolean;
    }) => {
      const response = await fetch("/api/import/meal-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Import failed");
      return response.json();
    },
  });

  // 멤버 이름으로 멤버 찾기
  const findMemberByName = useCallback(
    (name: string): Member | null => {
      if (members.length === 0) return null;
      return (
        members.find(
          (m) =>
            m.full_name === name ||
            m.full_name.replace(/\s/g, "") === name.replace(/\s/g, ""),
        ) || null
      );
    },
    [members],
  );

  // members 데이터가 로드되면 매칭되지 않은 파일들 재매칭
  useEffect(() => {
    if (members.length === 0) return;

    setUploadedFiles((prev) => {
      // 매칭되지 않은 파일이 있는지 확인
      const hasUnmatched = prev.some((f) => !f.matchedMember);
      if (!hasUnmatched) return prev;

      return prev.map((fileState) => {
        // 이미 매칭된 경우 스킵
        if (fileState.matchedMember) return fileState;
        // 유니코드 정규화 (NFC) 적용하여 매칭
        const normalizedMemberName = fileState.memberName.normalize("NFC");
        const matchedMember =
          members.find((m) => {
            const normalizedFullName = m.full_name.normalize("NFC");
            return (
              normalizedFullName === normalizedMemberName ||
              normalizedFullName.replace(/\s/g, "") ===
                normalizedMemberName.replace(/\s/g, "")
            );
          }) || null;
        return { ...fileState, matchedMember };
      });
    });
  }, [members]);

  // 파일 드롭 핸들러
  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const newFiles: FileUploadState[] = [];

      for (const file of acceptedFiles) {
        if (!file.name.endsWith(".xlsx")) {
          toast.error(`${file.name}: xlsx 파일만 지원합니다.`);
          continue;
        }

        // 이미 업로드된 파일인지 확인
        if (uploadedFiles.some((f) => f.file.name === file.name)) {
          toast.error(`${file.name}: 이미 업로드된 파일입니다.`);
          continue;
        }

        try {
          const buffer = await file.arrayBuffer();
          const { parseExcelFile } = await import("@/lib/excel-parser");
          const parseResult = parseExcelFile(buffer, file.name);
          // 유니코드 정규화 (NFC) 적용
          const normalizedMemberName = parseResult.memberName.normalize("NFC");
          // members를 직접 참조하여 매칭
          const matchedMember =
            members.find((m) => {
              const normalizedFullName = m.full_name.normalize("NFC");
              return (
                normalizedFullName === normalizedMemberName ||
                normalizedFullName.replace(/\s/g, "") ===
                  normalizedMemberName.replace(/\s/g, "")
              );
            }) || null;
          newFiles.push({
            ...parseResult,
            file,
            matchedMember,
            status: "pending",
          });
        } catch (error) {
          toast.error(`${file.name}: 파일 읽기 실패`);
        }
      }

      setUploadedFiles((prev) => [...prev, ...newFiles]);
    },
    [uploadedFiles, members],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
        ".xlsx",
      ],
    },
    multiple: true,
  });

  // 파일 제거
  const removeFile = (fileName: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.file.name !== fileName));
    if (selectedPreview === fileName) {
      setSelectedPreview(null);
    }
  };

  // 단일 파일 Import
  const importFile = async (
    fileState: FileUploadState,
    showResultDialog = true,
  ) => {
    if (!fileState.matchedMember) {
      toast.error("멤버 매칭이 필요합니다.");
      return null;
    }

    setUploadedFiles((prev) =>
      prev.map((f) =>
        f.file.name === fileState.file.name ? { ...f, status: "importing" } : f,
      ),
    );

    try {
      const result = await importMutation.mutateAsync({
        memberId: fileState.matchedMember.id,
        records: fileState.records,
        overwrite,
      });

      setUploadedFiles((prev) =>
        prev.map((f) =>
          f.file.name === fileState.file.name
            ? { ...f, status: result.success ? "success" : "error", result }
            : f,
        ),
      );

      if (result.success) {
        // 관련 쿼리 무효화
        await queryClient.invalidateQueries({
          queryKey: queryKeys.mealLogs.all,
        });
        await queryClient.invalidateQueries({ queryKey: queryKeys.stats.all });
        await queryClient.invalidateQueries({ queryKey: ["dashboard"] });

        if (showResultDialog) {
          setImportResults([
            {
              fileName: fileState.file.name,
              inserted: result.inserted,
              updated: result.updated,
              skipped: result.skipped,
            },
          ]);
          setIsResultOpen(true);
        }

        return {
          fileName: fileState.file.name,
          inserted: result.inserted as number,
          updated: result.updated as number,
          skipped: result.skipped as number,
        };
      } else {
        toast.error(`${fileState.memberName}: 일부 오류 발생`);
        return null;
      }
    } catch {
      setUploadedFiles((prev) =>
        prev.map((f) =>
          f.file.name === fileState.file.name ? { ...f, status: "error" } : f,
        ),
      );
      toast.error(`${fileState.memberName}: Import 실패`);
      return null;
    }
  };

  // 전체 Import
  const importAll = async () => {
    const filesToImport = uploadedFiles.filter(
      (f) => f.status === "pending" && f.matchedMember && f.records.length > 0,
    );

    const results: {
      fileName: string;
      inserted: number;
      updated: number;
      skipped: number;
    }[] = [];

    for (const file of filesToImport) {
      const result = await importFile(file, false);
      if (result) {
        results.push(result);
      }
    }

    // 관련 쿼리 무효화하여 최신 데이터 반영
    await queryClient.invalidateQueries({ queryKey: queryKeys.mealLogs.all });
    await queryClient.invalidateQueries({ queryKey: queryKeys.stats.all });
    await queryClient.invalidateQueries({ queryKey: ["dashboard"] });

    // 결과 Dialog 표시
    if (results.length > 0) {
      setImportResults(results);
      setIsResultOpen(true);
    }
  };

  // 통계
  const stats = {
    total: uploadedFiles.length,
    matched: uploadedFiles.filter((f) => f.matchedMember).length,
    pending: uploadedFiles.filter((f) => f.status === "pending").length,
    success: uploadedFiles.filter((f) => f.status === "success").length,
    error: uploadedFiles.filter((f) => f.status === "error" || !f.success)
      .length,
  };

  const selectedFile = uploadedFiles.find(
    (f) => f.file.name === selectedPreview,
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-12 gap-6">
        {/* 왼쪽: 업로드 영역 */}
        <div className="col-span-5 space-y-4">
          {/* 드롭존 */}
          <Card className="glass-panel border border-gray-100 shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Upload className="w-4 h-4" />
                파일 업로드
              </CardTitle>
              <CardDescription>
                멤버 이름.xlsx 형식의 파일을 업로드하세요.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
                  isDragActive
                    ? "border-blue-400 bg-blue-50"
                    : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                }`}
              >
                <input {...getInputProps()} />
                <FileSpreadsheet className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                {isDragActive ? (
                  <p className="text-blue-600 font-medium">
                    파일을 여기에 놓으세요
                  </p>
                ) : (
                  <>
                    <p className="text-gray-600 font-medium">
                      클릭하거나 파일을 드래그하세요
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      여러 파일 동시 업로드 가능 (.xlsx)
                    </p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 옵션 */}
          <Card className="glass-panel border border-gray-100 shadow-none">
            <CardContent className="pt-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="overwrite"
                  checked={overwrite}
                  onCheckedChange={(checked) => setOverwrite(checked === true)}
                />
                <Label htmlFor="overwrite" className="text-sm cursor-pointer">
                  기존 데이터 덮어쓰기
                </Label>
              </div>
              <p className="text-xs text-gray-400 mt-1 ml-6">
                체크 해제 시 이미 존재하는 날짜는 건너뜁니다.
              </p>
            </CardContent>
          </Card>

          {/* 파일 목록 */}
          {uploadedFiles.length > 0 && (
            <Card className="glass-panel border border-gray-100 shadow-none">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    업로드된 파일 ({stats.total})
                  </CardTitle>
                  <Button
                    size="sm"
                    onClick={importAll}
                    disabled={stats.pending === 0 || stats.matched === 0}
                  >
                    <Play className="w-4 h-4 mr-1" />
                    전체 Import
                  </Button>
                </div>
                <CardDescription>
                  매칭됨 {stats.matched} / 대기 {stats.pending} / 완료{" "}
                  {stats.success} / 오류 {stats.error}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[400px] overflow-y-auto">
                {uploadedFiles.map((fileState) => (
                  <div
                    key={fileState.file.name}
                    className={`flex items-center gap-3 p-3 rounded-md border cursor-pointer transition-all ${
                      selectedPreview === fileState.file.name
                        ? "border-blue-400 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => setSelectedPreview(fileState.file.name)}
                  >
                    {/* 상태 아이콘 */}
                    {fileState.status === "importing" ? (
                      <Loader2 className="w-5 h-5 text-blue-500 animate-spin flex-shrink-0" />
                    ) : fileState.status === "success" ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                    ) : fileState.status === "error" ? (
                      <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                    ) : !fileState.success && fileState.records.length === 0 ? (
                      <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                    ) : !fileState.matchedMember && membersLoading ? (
                      <Loader2 className="w-5 h-5 text-gray-400 animate-spin flex-shrink-0" />
                    ) : !fileState.matchedMember ? (
                      <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                    ) : (
                      <FileSpreadsheet className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    )}
                    {/* 파일 정보 */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-700 truncate">
                        {fileState.file.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {fileState.matchedMember ? (
                          <span className="text-green-600">
                            → {fileState.matchedMember.full_name}
                          </span>
                        ) : membersLoading ? (
                          <span className="text-gray-400">매칭 중...</span>
                        ) : (
                          <span className="text-amber-600">매칭 실패</span>
                        )}
                        {" · "}
                        {fileState.records.length}건
                        {fileState.result && (
                          <span className="ml-1">
                            (추가 {fileState.result.inserted}, 업데이트{" "}
                            {fileState.result.updated}, 건너뜀{" "}
                            {fileState.result.skipped})
                          </span>
                        )}
                      </p>
                    </div>

                    {/* 액션 버튼 */}
                    <div className="flex gap-1">
                      {fileState.status === "pending" &&
                        fileState.matchedMember &&
                        fileState.records.length > 0 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              importFile(fileState);
                            }}
                          >
                            <Play className="w-4 h-4" />
                          </Button>
                        )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-gray-400 hover:text-red-500"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(fileState.file.name);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* 오른쪽: 미리보기 */}
        <div className="col-span-7">
          <Card className="glass-panel border border-gray-100 shadow-none h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">데이터 미리보기</CardTitle>
              <CardDescription>
                {selectedFile
                  ? `${selectedFile.file.name} - ${selectedFile.records.length}건`
                  : "왼쪽에서 파일을 선택하세요"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedFile ? (
                <div className="border rounded-md overflow-hidden">
                  <div className="max-h-[500px] overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[100px]">날짜</TableHead>
                          <TableHead className="w-[60px]">근태</TableHead>
                          <TableHead>조식</TableHead>
                          <TableHead>중식</TableHead>
                          <TableHead>석식</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedFile.records
                          .slice(0, 50)
                          .map((record, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="font-medium text-xs">
                                {record.date}
                              </TableCell>
                              <TableCell className="text-xs">
                                {record.attendance || "-"}
                              </TableCell>
                              <TableCell className="text-xs">
                                {record.breakfast_store ? (
                                  <span>
                                    {record.breakfast_store}
                                    {record.breakfast_amount && (
                                      <span className="text-gray-500 ml-1">
                                        (
                                        {record.breakfast_amount.toLocaleString()}
                                        원)
                                      </span>
                                    )}
                                  </span>
                                ) : (
                                  "-"
                                )}
                              </TableCell>
                              <TableCell className="text-xs">
                                {record.lunch_store ? (
                                  <span>
                                    {record.lunch_store}
                                    {record.lunch_amount && (
                                      <span className="text-gray-500 ml-1">
                                        ({record.lunch_amount.toLocaleString()}
                                        원)
                                      </span>
                                    )}
                                  </span>
                                ) : (
                                  "-"
                                )}
                              </TableCell>
                              <TableCell className="text-xs">
                                {record.dinner_store ? (
                                  <span>
                                    {record.dinner_store}
                                    {record.dinner_amount && (
                                      <span className="text-gray-500 ml-1">
                                        ({record.dinner_amount.toLocaleString()}
                                        원)
                                      </span>
                                    )}
                                  </span>
                                ) : (
                                  "-"
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                  {selectedFile.records.length > 50 && (
                    <div className="p-2 text-center text-xs text-gray-400 border-t">
                      처음 50건만 표시됩니다. 전체 {selectedFile.records.length}
                      건
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-400">
                  <div className="text-center">
                    <FileSpreadsheet className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>파일을 선택하면 미리보기가 표시됩니다</p>
                  </div>
                </div>
              )}

              {/* 파싱 에러 표시 */}
              {selectedFile && selectedFile.errors.length > 0 && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
                  <p className="text-sm font-medium text-amber-700 mb-2">
                    파싱 경고 ({selectedFile.errors.length}건)
                  </p>
                  <ul className="text-xs text-amber-600 space-y-1">
                    {selectedFile.errors.slice(0, 5).map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                    {selectedFile.errors.length > 5 && (
                      <li>... 외 {selectedFile.errors.length - 5}건</li>
                    )}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Import 결과 Dialog */}
      <Dialog open={isResultOpen} onOpenChange={setIsResultOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Import 결과</DialogTitle>
          </DialogHeader>
          <div className="border rounded-md overflow-hidden max-h-[300px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky top-0 bg-white z-10">
                    파일명
                  </TableHead>
                  <TableHead className="sticky top-0 bg-white z-10 text-right">
                    추가
                  </TableHead>
                  <TableHead className="sticky top-0 bg-white z-10 text-right">
                    업데이트
                  </TableHead>
                  <TableHead className="sticky top-0 bg-white z-10 text-right">
                    건너뜀
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {importResults.map((r) => (
                  <TableRow key={r.fileName}>
                    <TableCell className="text-xs truncate max-w-[160px]">
                      {r.fileName}
                    </TableCell>
                    <TableCell className="text-right text-xs">
                      {r.inserted}
                    </TableCell>
                    <TableCell className="text-right text-xs">
                      {r.updated}
                    </TableCell>
                    <TableCell className="text-right text-xs">
                      {r.skipped}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="text-sm text-gray-600">
            총 {importResults.reduce((sum, r) => sum + r.inserted, 0)}건 추가,{" "}
            {importResults.reduce((sum, r) => sum + r.updated, 0)}건 업데이트
          </p>
          <DialogFooter>
            <Button onClick={() => setIsResultOpen(false)}>확인</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
