"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
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
import { useCreatePersonnel, useUpdatePersonnel } from "@/hooks/use-interview-personnel";
import type { InterviewPersonnel, PersonnelRole, PersonnelPayType, PersonnelStatus } from "@/lib/interview-types";

type FormData = {
  name: string;
  phone: string;
  role: PersonnelRole;
  bank_name: string;
  account_number: string;
  pay_type: "hourly" | "daily";
  default_pay_rate: number | "";
  contract_amount: number | "";
  memo: string;
  status: PersonnelStatus;
};

const defaultValues: FormData = {
  name: "",
  phone: "",
  role: "rp",
  bank_name: "",
  account_number: "",
  pay_type: "hourly",
  default_pay_rate: "",
  contract_amount: "",
  memo: "",
  status: "active",
};

type Props = {
  open: boolean;
  onClose: () => void;
  existing?: InterviewPersonnel | null;
};

export function PersonnelModal({ open, onClose, existing }: Props) {
  const createMutation = useCreatePersonnel();
  const updateMutation = useUpdatePersonnel();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormData>({ defaultValues });

  const role = watch("role");
  const isRP = role === "rp";

  useEffect(() => {
    if (existing) {
      reset({
        name: existing.name,
        phone: existing.phone ?? "",
        role: existing.role,
        bank_name: existing.bank_name ?? "",
        account_number: existing.account_number ?? "",
        pay_type: (existing.pay_type === "hourly" || existing.pay_type === "daily")
          ? existing.pay_type
          : "hourly",
        default_pay_rate: existing.default_pay_rate ?? "",
        contract_amount: existing.contract_amount ?? "",
        memo: existing.memo ?? "",
        status: existing.status,
      });
    } else {
      reset(defaultValues);
    }
  }, [existing, reset]);

  const onSubmit = async (data: FormData) => {
    try {
      let payload: Partial<InterviewPersonnel>;

      if (data.role === "rp") {
        payload = {
          name: data.name,
          phone: data.phone || null,
          role: data.role,
          bank_name: data.bank_name || null,
          account_number: data.account_number || null,
          pay_type: data.pay_type as PersonnelPayType,
          default_pay_rate: data.default_pay_rate !== "" ? Number(data.default_pay_rate) : null,
          contract_amount: null,
          memo: data.memo || null,
          status: data.status,
        };
      } else {
        payload = {
          name: data.name,
          phone: data.phone || null,
          role: data.role,
          bank_name: data.bank_name || null,
          account_number: data.account_number || null,
          pay_type: "contract" as PersonnelPayType,
          default_pay_rate: null,
          contract_amount: data.contract_amount !== "" ? Number(data.contract_amount) : null,
          memo: data.memo || null,
          status: data.status,
        };
      }

      if (existing) {
        await updateMutation.mutateAsync({ id: existing.id, ...payload });
        toast.success("인력 정보가 수정되었습니다.");
      } else {
        await createMutation.mutateAsync(payload);
        toast.success("인력이 등록되었습니다.");
      }
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "오류가 발생했습니다.");
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) onClose();
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85vh] p-0" style={{ maxWidth: "40rem" }}>
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle>{existing ? "인력 수정" : "인력 등록"}</DialogTitle>
          <DialogDescription>
            {existing ? "인력 정보를 수정합니다." : "새로운 인력 정보를 입력해주세요."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="overflow-y-auto px-6 py-4 space-y-4" style={{ maxHeight: "calc(85vh - 10rem)" }}>
            {/* 이름 */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                이름 <span className="text-red-500">*</span>
              </label>
              <input
                {...register("name", { required: "이름을 입력해주세요." })}
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-slate-400"
                placeholder="홍길동"
              />
              {errors.name && (
                <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>
              )}
            </div>

            {/* 연락처 */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">연락처</label>
              <input
                {...register("phone")}
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-slate-400"
                placeholder="010-0000-0000"
              />
            </div>

            {/* 역할 */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                역할 <span className="text-red-500">*</span>
              </label>
              <select
                {...register("role", { required: true })}
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-slate-400"
              >
                <option value="rp">RP</option>
                <option value="ft">FT</option>
                <option value="instructor">강사</option>
              </select>
            </div>

            {/* 은행명 */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">은행명</label>
              <input
                {...register("bank_name")}
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-slate-400"
                placeholder="국민은행"
              />
            </div>

            {/* 계좌번호 */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">계좌번호</label>
              <input
                {...register("account_number")}
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-slate-400"
                placeholder="000-0000-0000-00"
              />
            </div>

            {/* 역할별 조건부 급여 필드 */}
            {isRP ? (
              <>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">급여유형</label>
                  <select
                    {...register("pay_type")}
                    className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-slate-400"
                  >
                    <option value="hourly">시급</option>
                    <option value="daily">일급</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">기본 단가</label>
                  <input
                    {...register("default_pay_rate")}
                    type="number"
                    min={0}
                    className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-slate-400"
                    placeholder="10000"
                  />
                </div>
              </>
            ) : (
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">계약금</label>
                <input
                  {...register("contract_amount")}
                  type="number"
                  min={0}
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-slate-400"
                  placeholder="300000"
                />
              </div>
            )}

            {/* 메모 */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">메모</label>
              <textarea
                {...register("memo")}
                rows={3}
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-slate-400 resize-none"
                placeholder="메모를 입력하세요."
              />
            </div>

            {/* 상태 — 수정 시에만 */}
            {existing && (
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">상태</label>
                <select
                  {...register("status")}
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-slate-400"
                >
                  <option value="active">활동</option>
                  <option value="inactive">비활동</option>
                </select>
              </div>
            )}
          </div>

          <DialogFooter className="border-t px-6 py-4">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
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
