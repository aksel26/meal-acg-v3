"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Send, Loader2 } from "lucide-react";
import { Button } from "@repo/ui/src/button";
import { Label } from "@repo/ui/src/label";
import { DatePicker } from "@repo/ui/src/date-picker";
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

interface ApproverOption {
  id: string;
  full_name: string;
  member_role: string | null;
  team_name: string | null;
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
  const [approvers, setApprovers] = useState<ApproverOption[]>([]);
  const [approverId, setApproverId] = useState("");
  const [loadingApprovers, setLoadingApprovers] = useState(false);

  // 근태 유형 로드
  useEffect(() => {
    fetch("/api/leave-types")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          // 지각/조퇴 제외 (신청 대상이 아님)
          setLeaveTypes(
            data.filter((t: LeaveType) => t.category !== "지각/조퇴"),
          );
        }
      })
      .catch(() => {});
  }, []);

  // 승인자 선택 목록 및 조직 기준 기본 승인자 로드
  useEffect(() => {
    if (!memberId) return;
    const controller = new AbortController();
    setLoadingApprovers(true);
    fetch("/api/leave-requests", { signal: controller.signal })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "승인자 목록 조회 실패");
        }
        return data;
      })
      .then((data) => {
        const options = Array.isArray(data.approvers) ? data.approvers : [];
        setApprovers(options);
        setApproverId((current) =>
          options.some((option: ApproverOption) => option.id === current)
            ? current
            : data.default_approver_id || "",
        );
      })
      .catch((error) => {
        if (error instanceof Error && error.name !== "AbortError") {
          toast.error(error.message);
          setApprovers([]);
          setApproverId("");
        }
      })
      .finally(() => setLoadingApprovers(false));

    return () => controller.abort();
  }, [memberId]);

  const handleSubmit = () => {
    if (!memberId || !leaveTypeId || !startDate || !approverId) {
      toast.error("필수 항목을 입력해주세요.");
      return;
    }

    createRequest.mutate(
      {
        memberId,
        startDate,
        endDate: endDate || undefined,
        leaveTypeId: parseInt(leaveTypeId),
        approverId,
        reason: reason || undefined,
      },
      {
        onSuccess: (data) => {
          toast.success(`휴가 신청이 완료되었습니다. (${data.dates_count}일)`);
          router.push("/dashboard");
        },
        onError: (error: Error) => {
          toast.error(error.message);
        },
      },
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <button
          onClick={() => router.back()}
          className="rounded-xl p-2 transition-colors hover:bg-white/60"
          aria-label="이전 페이지로 이동"
        >
          <ChevronLeft className="h-5 w-5 text-slate-600" />
        </button>
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
        <div className="space-y-2">
          <Label className="text-sm font-medium text-slate-700">날짜 *</Label>
          <DatePicker
            value={startDate}
            onChange={(date) => {
              setStartDate(date);
              setEndDate(date);
            }}
          />
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

        {/* 승인자 */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-slate-700">승인자 *</Label>
          <Select
            value={approverId}
            onValueChange={setApproverId}
            disabled={loadingApprovers || approvers.length === 0}
          >
            <SelectTrigger>
              <SelectValue
                placeholder={
                  loadingApprovers
                    ? "승인자 목록을 불러오는 중..."
                    : "승인자를 선택하세요"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {approvers.map((approver) => (
                <SelectItem key={approver.id} value={approver.id}>
                  {approver.full_name}
                  {approver.member_role ? ` · ${approver.member_role}` : ""}
                  {approver.team_name ? ` · ${approver.team_name}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!loadingApprovers && approvers.length === 0 && (
            <p className="text-xs text-red-500">
              선택할 수 있는 승인자가 없습니다. 조직 정보를 확인해주세요.
            </p>
          )}
        </div>

        {/* 제출 */}
        <Button
          onClick={handleSubmit}
          disabled={
            createRequest.isPending ||
            loadingApprovers ||
            !leaveTypeId ||
            !startDate ||
            !approverId
          }
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
