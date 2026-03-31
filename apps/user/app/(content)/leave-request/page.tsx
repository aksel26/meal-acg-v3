"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, ChevronLeft, Send, Users, Loader2 } from "lucide-react";
import { Button } from "@repo/ui/src/button";
import { Input } from "@repo/ui/src/input";
import { Label } from "@repo/ui/src/label";
import { Textarea } from "@repo/ui/src/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/src/select";
import { toast } from "@repo/ui/src/sonner";
import { useUserStore } from "@/stores/userStore";
import { useCreateLeaveRequest } from "@/hooks/use-approvals";

interface LeaveType {
  id: number;
  name: string;
  category: string;
  duration_type: string;
}

export default function LeaveRequestPage() {
  const router = useRouter();
  const { memberId } = useUserStore();
  const createRequest = useCreateLeaveRequest();

  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [leaveTypeId, setLeaveTypeId] = useState<string>("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [approverName, setApproverName] = useState<string | null>(null);
  const [loadingApprover, setLoadingApprover] = useState(false);

  // 근태 유형 로드
  useEffect(() => {
    fetch("/api/leave-types")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          // 지각/조퇴 제외 (신청 대상이 아님)
          setLeaveTypes(
            data.filter(
              (t: LeaveType) =>
                t.category !== "지각/조퇴"
            )
          );
        }
      })
      .catch(() => {});
  }, []);

  // 승인자 미리보기
  useEffect(() => {
    if (!memberId) return;
    setLoadingApprover(true);
    fetch(`/api/users?memberId=${memberId}&includeApprover=true`)
      .then((res) => res.json())
      .then((data) => {
        if (data.approver_name) {
          setApproverName(data.approver_name);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingApprover(false));
  }, [memberId]);

  const handleSubmit = () => {
    if (!memberId || !leaveTypeId || !startDate) {
      toast.error("필수 항목을 입력해주세요.");
      return;
    }

    createRequest.mutate(
      {
        memberId,
        startDate,
        endDate: endDate || undefined,
        leaveTypeId: parseInt(leaveTypeId),
        reason: reason || undefined,
      },
      {
        onSuccess: (data) => {
          toast.success(
            `휴가 신청이 완료되었습니다. (${data.dates_count}일)`
          );
          router.push("/dashboard");
        },
        onError: (error: Error) => {
          toast.error(error.message);
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="rounded-xl p-2 transition-colors hover:bg-white/60"
        >
          <ChevronLeft className="h-5 w-5 text-slate-600" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-slate-900">휴가 신청</h1>
          <p className="text-xs text-slate-500">
            승인자에게 자동으로 요청이 전달됩니다.
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="space-y-5 rounded-2xl bg-white/70 p-5 backdrop-blur-sm">
        {/* 휴가 유형 */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-slate-700">
            휴가 유형 *
          </Label>
          <Select value={leaveTypeId} onValueChange={setLeaveTypeId}>
            <SelectTrigger>
              <SelectValue placeholder="유형을 선택하세요" />
            </SelectTrigger>
            <SelectContent>
              {leaveTypes.map((type) => (
                <SelectItem key={type.id} value={String(type.id)}>
                  {type.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 날짜 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-700">
              시작일 *
            </Label>
            <div className="relative">
              <CalendarDays className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-700">
              종료일
            </Label>
            <div className="relative">
              <CalendarDays className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="pl-10"
                min={startDate}
              />
            </div>
          </div>
        </div>

        {/* 사유 */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-slate-700">사유</Label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="사유를 입력하세요 (선택)"
            rows={3}
          />
        </div>

        {/* 승인자 정보 */}
        <div className="rounded-xl bg-blue-50 p-3">
          <div className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-blue-500" />
            <span className="font-medium text-blue-700">승인자</span>
          </div>
          <p className="mt-1 text-sm text-blue-600">
            {loadingApprover
              ? "확인 중..."
              : approverName
                ? approverName
                : "조직 구조에 따라 자동 결정됩니다."}
          </p>
        </div>

        {/* 제출 */}
        <Button
          onClick={handleSubmit}
          disabled={createRequest.isPending || !leaveTypeId || !startDate}
          className="w-full gap-2"
        >
          {createRequest.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              신청 중...
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              휴가 신청
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
