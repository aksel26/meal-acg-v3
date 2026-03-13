"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useJobPosting } from "@/hooks/use-job-postings";
import { useCreateJobPosting, useUpdateJobPosting } from "@/hooks/use-job-posting-mutations";
import { useMembers } from "@/hooks/use-members";
import { toast } from "@repo/ui/src/sonner";
import { X } from "lucide-react";
import type { JobPosting } from "@/lib/supabase/types";

type FormData = {
  title: string;
  start_date: string;
  end_date: string;
  work_start: string;
  work_end: string;
  headcount: number;
  work_type: "online" | "offline";
  shift_type: "day" | "night";
  location: string;
  lunch_start: string;
  lunch_end: string;
  pay_rate: number;
  pay_type: "hourly" | "daily";
  platform: string;
  status: "open" | "closed" | "draft" | "in_progress" | "completed";
  description: string;
  supervisor_id: string;
};

const defaultValues: FormData = {
  title: "",
  start_date: "",
  end_date: "",
  work_start: "",
  work_end: "",
  headcount: 1,
  work_type: "offline",
  shift_type: "day",
  location: "",
  lunch_start: "",
  lunch_end: "",
  pay_rate: 0,
  pay_type: "daily",
  platform: "",
  status: "draft",
  description: "",
  supervisor_id: "",
};

export default function JobPostingModal({
  open,
  onClose,
  editingId,
}: {
  open: boolean;
  onClose: () => void;
  editingId: string | null;
}) {
  const { data: existing } = useJobPosting(editingId);
  const { data: members = [] } = useMembers();
  const createMutation = useCreateJobPosting();
  const updateMutation = useUpdateJobPosting();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({ defaultValues });

  useEffect(() => {
    if (editingId && existing) {
      reset({
        title: existing.title,
        start_date: existing.start_date,
        end_date: existing.end_date,
        work_start: existing.work_start || "",
        work_end: existing.work_end || "",
        headcount: existing.headcount,
        work_type: existing.work_type || "offline",
        shift_type: existing.shift_type || "day",
        location: existing.location || "",
        lunch_start: existing.lunch_start || "",
        lunch_end: existing.lunch_end || "",
        pay_rate: existing.pay_rate,
        pay_type: existing.pay_type,
        platform: existing.platform || "",
        status: existing.status,
        description: existing.description || "",
        supervisor_id: existing.supervisor_id || "",
      });
    } else if (!editingId) {
      reset(defaultValues);
    }
  }, [editingId, existing, reset]);

  const onSubmit = async (data: FormData) => {
    try {
      const payload: Partial<JobPosting> = {
        title: data.title,
        start_date: data.start_date,
        end_date: data.end_date,
        work_start: data.work_start || null,
        work_end: data.work_end || null,
        headcount: data.headcount,
        work_type: data.work_type,
        shift_type: data.shift_type,
        location: data.location || null,
        lunch_start: data.lunch_start || null,
        lunch_end: data.lunch_end || null,
        pay_rate: data.pay_rate,
        pay_type: data.pay_type,
        platform: data.platform || null,
        status: data.status,
        description: data.description || null,
        supervisor_id: data.supervisor_id || null,
        supervisor_name: data.supervisor_id
          ? members.find((m) => m.id === data.supervisor_id)?.full_name || null
          : null,
      };

      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, ...payload });
        toast.success("공고가 수정되었습니다.");
      } else {
        await createMutation.mutateAsync(payload);
        toast.success("공고가 등록되었습니다.");
      }
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "오류가 발생했습니다.");
    }
  };

  if (!open) return null;

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            {editingId ? "공고 수정" : "공고 등록"}
          </h3>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* 제목 */}
          <div>
            <label className="mb-1 block text-sm font-medium">제목 *</label>
            <input
              {...register("title", { required: "제목을 입력하세요" })}
              className="w-full rounded-lg border px-3 py-2 text-sm"
              placeholder="공고 제목"
            />
            {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title.message}</p>}
          </div>

          {/* 일자 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium">시작일 *</label>
              <input
                type="date"
                {...register("start_date", { required: "시작일을 선택하세요" })}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">종료일 *</label>
              <input
                type="date"
                {...register("end_date", { required: "종료일을 선택하세요" })}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>
          </div>

          {/* 근무시간 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium">근무 시작</label>
              <input
                type="time"
                {...register("work_start")}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">근무 종료</label>
              <input
                type="time"
                {...register("work_end")}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>
          </div>

          {/* 인원 */}
          <div>
            <label className="mb-1 block text-sm font-medium">모집인원 *</label>
            <input
              type="number"
              {...register("headcount", { required: true, valueAsNumber: true, min: 1 })}
              className="w-full rounded-lg border px-3 py-2 text-sm"
            />
          </div>

          {/* 유형 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium">형태</label>
              <select
                {...register("work_type")}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              >
                <option value="offline">오프라인</option>
                <option value="online">온라인</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">시간대</label>
              <select
                {...register("shift_type")}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              >
                <option value="day">주간</option>
                <option value="night">야간</option>
              </select>
            </div>
          </div>

          {/* 장소 */}
          <div>
            <label className="mb-1 block text-sm font-medium">장소</label>
            <input
              {...register("location")}
              className="w-full rounded-lg border px-3 py-2 text-sm"
              placeholder="근무 장소"
            />
          </div>

          {/* 점심시간 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium">점심 시작</label>
              <input
                type="time"
                {...register("lunch_start")}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">점심 종료</label>
              <input
                type="time"
                {...register("lunch_end")}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>
          </div>

          {/* 비용 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium">급여 *</label>
              <input
                type="number"
                {...register("pay_rate", { required: true, valueAsNumber: true, min: 0 })}
                className="w-full rounded-lg border px-3 py-2 text-sm"
                placeholder="금액"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">급여 유형</label>
              <select
                {...register("pay_type")}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              >
                <option value="daily">일급</option>
                <option value="hourly">시급</option>
              </select>
            </div>
          </div>

          {/* 플랫폼 */}
          <div>
            <label className="mb-1 block text-sm font-medium">플랫폼</label>
            <input
              {...register("platform")}
              className="w-full rounded-lg border px-3 py-2 text-sm"
              placeholder="예: CJ, SK, 쿠팡"
            />
          </div>

          {/* 상태 */}
          <div>
            <label className="mb-1 block text-sm font-medium">상태</label>
            <select
              {...register("status")}
              className="w-full rounded-lg border px-3 py-2 text-sm"
            >
              <option value="draft">임시</option>
              <option value="open">모집중</option>
              <option value="closed">마감</option>
              <option value="in_progress">진행중</option>
              <option value="completed">완료</option>
            </select>
          </div>

          {/* 담당자 */}
          <div>
            <label className="mb-1 block text-sm font-medium">담당자</label>
            <select
              {...register("supervisor_id")}
              className="w-full rounded-lg border px-3 py-2 text-sm"
            >
              <option value="">선택 안함</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name}
                </option>
              ))}
            </select>
          </div>

          {/* 내용 */}
          <div>
            <label className="mb-1 block text-sm font-medium">내용</label>
            <textarea
              {...register("description")}
              rows={4}
              className="w-full rounded-lg border px-3 py-2 text-sm"
              placeholder="공고 상세 내용"
            />
          </div>

          {/* 버튼 */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border px-4 py-2 text-sm hover:bg-slate-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {isPending ? "저장 중..." : editingId ? "수정" : "등록"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
