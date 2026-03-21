"use client";

import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { useInterviewJobPosting } from "@/hooks/use-interview-job-postings";
import {
  useCreateInterviewJobPosting,
  useUpdateInterviewJobPosting,
} from "@/hooks/use-interview-job-postings";
import { toast } from "@repo/ui/src/sonner";
import { Button } from "@repo/ui/src/button";
import { DatePicker } from "@repo/ui/src/date-picker";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@repo/ui/src/dialog";

type FormData = {
  title: string;
  start_date: string;
  end_date: string;
  work_start: string;
  work_end: string;
  platform: string;
  total_headcount: number;
  ft_count: number;
  rp_count: number;
  instructor_count: number;
  other_count: number;
  pay_rate: number;
  pay_type: string;
  status: string;
  description: string;
};

const defaultValues: FormData = {
  title: "",
  start_date: new Date().toISOString().slice(0, 10),
  end_date: new Date().toISOString().slice(0, 10),
  work_start: "",
  work_end: "",
  platform: "",
  total_headcount: 0,
  ft_count: 0,
  rp_count: 0,
  instructor_count: 0,
  other_count: 0,
  pay_rate: 0,
  pay_type: "daily",
  status: "draft",
  description: "",
};

export function InterviewJobPostingModal({
  open,
  onClose,
  editingId,
}: {
  open: boolean;
  onClose: () => void;
  editingId: string | null;
}) {
  const { data: existing } = useInterviewJobPosting(editingId);
  const createMutation = useCreateInterviewJobPosting();
  const updateMutation = useUpdateInterviewJobPosting();

  const {
    register,
    handleSubmit,
    reset,
    control,
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
        platform: existing.platform || "",
        total_headcount: existing.total_headcount,
        ft_count: existing.ft_count,
        rp_count: existing.rp_count,
        instructor_count: existing.instructor_count,
        other_count: existing.other_count,
        pay_rate: existing.pay_rate || 0,
        pay_type: existing.pay_type || "daily",
        status: existing.status,
        description: existing.description || "",
      });
    } else if (!editingId) {
      reset(defaultValues);
    }
  }, [editingId, existing, reset]);

  const onSubmit = async (data: FormData) => {
    try {
      const payload = {
        title: data.title,
        start_date: data.start_date,
        end_date: data.end_date,
        work_start: data.work_start || null,
        work_end: data.work_end || null,
        platform: data.platform || null,
        total_headcount: data.total_headcount,
        ft_count: data.ft_count,
        rp_count: data.rp_count,
        instructor_count: data.instructor_count,
        other_count: data.other_count,
        pay_rate: data.pay_rate || null,
        pay_type: data.pay_type,
        status: data.status,
        description: data.description || null,
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
      toast.error(
        error instanceof Error ? error.message : "오류가 발생했습니다.",
      );
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      reset(defaultValues);
      onClose();
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] p-0" style={{ maxWidth: "48rem" }}>
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle>{editingId ? "공고 수정" : "공고 등록"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div
            className="overflow-y-auto px-6 py-4"
            style={{ maxHeight: "calc(90vh - 10rem)" }}
          >
            <div className="grid grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    공고명 *
                  </label>
                  <input
                    {...register("title", { required: "공고명을 입력하세요" })}
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                    placeholder="공고명"
                  />
                  {errors.title && (
                    <p className="mt-1 text-xs text-red-500">
                      {errors.title.message}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      시작일 *
                    </label>
                    <Controller
                      name="start_date"
                      control={control}
                      rules={{ required: "시작일을 선택하세요" }}
                      render={({ field }) => (
                        <DatePicker
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="시작일"
                        />
                      )}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      종료일 *
                    </label>
                    <Controller
                      name="end_date"
                      control={control}
                      rules={{ required: "종료일을 선택하세요" }}
                      render={({ field }) => (
                        <DatePicker
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="종료일"
                        />
                      )}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      근무 시작
                    </label>
                    <input
                      type="time"
                      {...register("work_start")}
                      className="w-full rounded-lg border px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      근무 종료
                    </label>
                    <input
                      type="time"
                      {...register("work_end")}
                      className="w-full rounded-lg border px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    플랫폼
                  </label>
                  <input
                    {...register("platform")}
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                    placeholder="예: CJ, SK, 쿠팡"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">상태</label>
                  <select
                    {...register("status")}
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                  >
                    <option value="draft">임시</option>
                    <option value="open">모집중</option>
                    <option value="closed">마감</option>
                    <option value="completed">완료</option>
                  </select>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    총 인원 *
                  </label>
                  <input
                    type="number"
                    {...register("total_headcount", {
                      required: true,
                      valueAsNumber: true,
                      min: 0,
                    })}
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      FT 인원
                    </label>
                    <input
                      type="number"
                      {...register("ft_count", {
                        valueAsNumber: true,
                        min: 0,
                      })}
                      className="w-full rounded-lg border px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      RP 인원
                    </label>
                    <input
                      type="number"
                      {...register("rp_count", {
                        valueAsNumber: true,
                        min: 0,
                      })}
                      className="w-full rounded-lg border px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      강사 인원
                    </label>
                    <input
                      type="number"
                      {...register("instructor_count", {
                        valueAsNumber: true,
                        min: 0,
                      })}
                      className="w-full rounded-lg border px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      기타 인원
                    </label>
                    <input
                      type="number"
                      {...register("other_count", {
                        valueAsNumber: true,
                        min: 0,
                      })}
                      className="w-full rounded-lg border px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      기본 급여
                    </label>
                    <Controller
                      name="pay_rate"
                      control={control}
                      render={({ field }) => (
                        <input
                          inputMode="numeric"
                          className="w-full rounded-lg border px-3 py-2 text-sm"
                          placeholder="금액"
                          value={field.value ? field.value.toLocaleString() : ""}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/,/g, "");
                            const num = Number(raw);
                            if (!raw || !isNaN(num)) {
                              field.onChange(raw ? num : 0);
                            }
                          }}
                        />
                      )}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      급여 유형
                    </label>
                    <select
                      {...register("pay_type")}
                      className="w-full rounded-lg border px-3 py-2 text-sm"
                    >
                      <option value="daily">일급</option>
                      <option value="hourly">시급</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">설명</label>
                  <textarea
                    {...register("description")}
                    rows={3}
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                    placeholder="공고 설명"
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="border-t px-6 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              취소
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "저장 중..." : editingId ? "수정" : "등록"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
