"use client";

import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "@repo/ui/src/sonner";
import { Button } from "@repo/ui/src/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@repo/ui/src/dialog";

import WorkerFormFields, { workerFormDefaults } from "@/components/workers/WorkerFormFields";
import type { WorkerFormData } from "@/components/workers/WorkerFormFields";

export default function RegisterWorkerDialog({
  open,
  onClose,
  jobPostingId,
}: {
  open: boolean;
  onClose: () => void;
  jobPostingId: string;
}) {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<WorkerFormData>({
    defaultValues: workerFormDefaults,
  });

  const mutation = useMutation({
    mutationFn: async (data: WorkerFormData) => {
      const res = await fetch(`/api/job-postings/${jobPostingId}/workers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          email: data.email || null,
          gender: data.gender === "none" ? null : data.gender || null,
          birth_date: data.birth_date || null,
          bank_name: data.bank_name || null,
          account_number: data.account_number || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "등록에 실패했습니다.");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assignments.byJobPosting(jobPostingId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.workers.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.jobPostings.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });

  const onSubmit = async (data: WorkerFormData) => {
    try {
      await mutation.mutateAsync(data);
      toast.success("지원자가 등록되었습니다.");
      reset();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "오류가 발생했습니다.");
    }
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      reset();
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[85vh] p-0" style={{ maxWidth: "28rem" }}>
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle>지원자 등록</DialogTitle>
          <DialogDescription>새로운 지원자 정보를 입력해주세요.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="overflow-y-auto px-6 py-4" style={{ maxHeight: "calc(85vh - 10rem)" }}>
              <WorkerFormFields register={register} errors={errors} control={control} />
          </div>

          <DialogFooter className="border-t px-6 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
            >
              취소
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "등록 중..." : "등록"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
