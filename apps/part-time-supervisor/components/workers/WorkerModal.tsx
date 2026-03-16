"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useCreateWorker, useUpdateWorker } from "@/hooks/use-worker-mutations";
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

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<WorkerFormData>({
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
        gender: (data.gender === "none" ? null : data.gender as Worker["gender"]) || null,
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

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      onClose();
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[85vh] p-0" style={{ maxWidth: "48rem" }}>
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle>{existing ? "지원자 수정" : "지원자 등록"}</DialogTitle>
          <DialogDescription>
            {existing ? "지원자 정보를 수정합니다." : "새로운 지원자 정보를 입력해주세요."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="overflow-y-auto px-6 py-4" style={{ maxHeight: "calc(85vh - 10rem)" }}>
              <WorkerFormFields
                register={register}
                errors={errors}
                control={control}
                showStatus
              />
          </div>

          <DialogFooter className="border-t px-6 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
            >
              취소
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "저장 중..." : existing ? "수정" : "등록"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
