"use client";

import { useForm } from "react-hook-form";
import { useCreateInterviewJobAssignment } from "@/hooks/use-interview-job-assignments";
import { toast } from "@repo/ui/src/sonner";
import { Button } from "@repo/ui/src/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@repo/ui/src/dialog";
import type { InterviewJobPosting } from "@/lib/interview-types";

type FormData = {
  name: string;
  phone: string;
  role: string;
  bank_name: string;
  account_number: string;
  memo: string;
  pay_type: string;
  pay_rate: number;
  work_hours: number | null;
};

export function RegisterAndAssignDialog({
  open,
  onClose,
  jobPostingId,
  jobPosting,
}: {
  open: boolean;
  onClose: () => void;
  jobPostingId: string;
  jobPosting: InterviewJobPosting;
}) {
  const createMutation = useCreateInterviewJobAssignment(jobPostingId);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      name: "",
      phone: "",
      role: "rp",
      bank_name: "",
      account_number: "",
      memo: "",
      pay_type: jobPosting.pay_type || "daily",
      pay_rate: jobPosting.pay_rate || 0,
      work_hours: null,
    },
  });

  const payType = watch("pay_type");

  const onSubmit = async (data: FormData) => {
    try {
      await createMutation.mutateAsync({
        new_personnel: {
          name: data.name,
          phone: data.phone || null,
          role: data.role,
          bank_name: data.bank_name || null,
          account_number: data.account_number || null,
          pay_type: data.pay_type === "hourly" ? "hourly" : "daily",
          default_pay_rate: data.pay_rate,
          memo: data.memo || null,
        },
        pay_type: data.pay_type,
        pay_rate: data.pay_rate,
        work_hours: data.pay_type === "hourly" ? data.work_hours : null,
      });
      toast.success("인력 등록 및 배정이 완료되었습니다.");
      reset();
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "오류가 발생했습니다.",
      );
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          reset();
          onClose();
        }
      }}
    >
      <DialogContent className="max-h-[85vh] p-0" style={{ maxWidth: "32rem" }}>
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle>신규 인력 등록 & 배정</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div
            className="space-y-4 overflow-y-auto px-6 py-4"
            style={{ maxHeight: "calc(85vh - 10rem)" }}
          >
            <div>
              <label className="mb-1 block text-sm font-medium">이름 *</label>
              <input
                {...register("name", { required: "이름을 입력하세요" })}
                className="w-full rounded-lg border px-3 py-2 text-sm"
                placeholder="이름"
              />
              {errors.name && (
                <p className="mt-1 text-xs text-red-500">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium">연락처</label>
                <input
                  {...register("phone")}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  placeholder="010-0000-0000"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">역할 *</label>
                <select
                  {...register("role")}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                >
                  <option value="rp">RP</option>
                  <option value="ft">FT</option>
                  <option value="instructor">강사</option>
                  <option value="other">기타</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium">은행</label>
                <input
                  {...register("bank_name")}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  placeholder="은행명"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">
                  계좌번호
                </label>
                <input
                  {...register("account_number")}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  placeholder="계좌번호"
                />
              </div>
            </div>

            <hr className="border-slate-200" />

            <div className="grid grid-cols-3 gap-3">
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
              <div>
                <label className="mb-1 block text-sm font-medium">급여</label>
                <input
                  type="number"
                  {...register("pay_rate", { valueAsNumber: true, min: 0 })}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  placeholder="금액"
                />
              </div>
              {payType === "hourly" && (
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    근무시간
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    {...register("work_hours", { valueAsNumber: true })}
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                    placeholder="시간"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">메모</label>
              <textarea
                {...register("memo")}
                rows={2}
                className="w-full rounded-lg border px-3 py-2 text-sm"
                placeholder="메모"
              />
            </div>
          </div>

          <DialogFooter className="border-t px-6 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                reset();
                onClose();
              }}
            >
              취소
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "등록 중..." : "등록 & 배정"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
