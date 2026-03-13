"use client";

import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "@repo/ui/src/sonner";
import { X } from "lucide-react";
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
          gender: data.gender || null,
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

  const handleClose = () => {
    reset();
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">지원자 등록</h3>
          <button onClick={handleClose} className="rounded-lg p-1 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <WorkerFormFields register={register} errors={errors} />

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg border px-4 py-2 text-sm hover:bg-slate-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {mutation.isPending ? "등록 중..." : "등록"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
