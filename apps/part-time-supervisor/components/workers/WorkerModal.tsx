"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useCreateWorker, useUpdateWorker } from "@/hooks/use-worker-mutations";
import { toast } from "@repo/ui/src/sonner";
import WorkerFormFields, { workerFormDefaults } from "./WorkerFormFields";
import type { WorkerFormData } from "./WorkerFormFields";
import type { Worker } from "@/lib/supabase/types";

export default function WorkerModal({
  open,
  onClose,
  existing,
}: {
  open: boolean;
  onClose: () => void;
  existing?: Worker | null;
}) {
  const createMutation = useCreateWorker();
  const updateMutation = useUpdateWorker();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<WorkerFormData>({
    defaultValues: workerFormDefaults,
  });

  useEffect(() => {
    if (existing) {
      reset({
        name: existing.name,
        phone: existing.phone || "",
        email: existing.email || "",
        birth_date: existing.birth_date || "",
        gender: existing.gender || "",
        address: existing.address || "",
        experience: existing.experience || "",
        warning: existing.warning || "",
        bank_name: existing.bank_name || "",
        account_number: existing.account_number || "",
        status: existing.status,
        note: existing.note || "",
      });
    } else {
      reset(workerFormDefaults);
    }
  }, [existing, reset]);

  const onSubmit = async (data: WorkerFormData) => {
    try {
      const payload: Partial<Worker> = {
        ...data,
        phone: data.phone || null,
        email: data.email || null,
        birth_date: data.birth_date || null,
        gender: (data.gender as Worker["gender"]) || null,
        address: data.address || null,
        experience: data.experience || null,
        warning: data.warning || null,
        bank_name: data.bank_name || null,
        account_number: data.account_number || null,
        note: data.note || null,
      };

      if (existing) {
        await updateMutation.mutateAsync({ id: existing.id, ...payload });
        toast.success("지원자 정보가 수정되었습니다.");
      } else {
        await createMutation.mutateAsync(payload);
        toast.success("지원자가 등록되었습니다.");
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
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="mb-4 text-lg font-semibold">
          {existing ? "지원자 수정" : "지원자 등록"}
        </h3>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <WorkerFormFields register={register} errors={errors} showStatus />

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
              {isPending ? "저장 중..." : existing ? "수정" : "등록"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
