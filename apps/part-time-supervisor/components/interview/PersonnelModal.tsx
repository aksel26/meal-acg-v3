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
  experience: string;
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
  experience: "",
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
        experience: existing.experience ?? "",
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
          experience: data.experience || null,
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
          experience: data.experience || null,
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
      <DialogContent className="max-h-[85vh] max-w-3xl sm:max-w-3xl p-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle>{existing ? "인력 수정" : "인력 등록"}</DialogTitle>
          <DialogDescription>
            {existing ? "인력 정보를 수정합니다." : "새로운 인력 정보를 입력해주세요."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="overflow-y-auto px-6 py-4" style={{ maxHeight: "calc(85vh - 10rem)" }}>
            <div className="grid grid-cols-2 gap-5">
              {/* 왼쪽: 기본 정보 */}
              <div className="space-y-5">
                <fieldset className="rounded-lg bg-slate-50 p-4">
                  <legend className="px-2 text-sm font-semibold text-slate-700">기본 정보</legend>
                  <div className="space-y-3">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-600">
                        이름 <span className="text-red-500">*</span>
                      </label>
                      <input
                        {...register("name", { required: "이름을 입력해주세요." })}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition-all duration-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                        placeholder="홍길동"
                      />
                      {errors.name && (
                        <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>
                      )}
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-600">연락처</label>
                      <input
                        {...register("phone")}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition-all duration-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                        placeholder="010-0000-0000"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-600">
                        역할 <span className="text-red-500">*</span>
                      </label>
                      <select
                        {...register("role", { required: true })}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition-all duration-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      >
                        <option value="rp">RP</option>
                        <option value="ft">FT</option>
                        <option value="instructor">강사</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-600">경력</label>
                      <input
                        {...register("experience")}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition-all duration-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                        placeholder="예: 면접교육 3회"
                      />
                    </div>
                    {existing && (
                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-600">상태</label>
                        <select
                          {...register("status")}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition-all duration-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                        >
                          <option value="active">활동</option>
                          <option value="inactive">비활동</option>
                        </select>
                      </div>
                    )}
                  </div>
                </fieldset>
              </div>

              {/* 오른쪽: 계좌 정보 + 급여 정보 + 메모 */}
              <div className="space-y-5">
                <fieldset className="rounded-lg bg-slate-50 p-4">
                  <legend className="px-2 text-sm font-semibold text-slate-700">계좌 정보</legend>
                  <div className="space-y-3">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-600">은행명</label>
                      <input
                        {...register("bank_name")}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition-all duration-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                        placeholder="국민은행"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-600">계좌번호</label>
                      <input
                        {...register("account_number")}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition-all duration-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                        placeholder="000-0000-0000-00"
                      />
                    </div>
                  </div>
                </fieldset>

                <fieldset className="rounded-lg bg-slate-50 p-4">
                  <legend className="px-2 text-sm font-semibold text-slate-700">급여 정보</legend>
                  {isRP ? (
                    <div className="space-y-3">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-600">급여유형</label>
                        <select
                          {...register("pay_type")}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition-all duration-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                        >
                          <option value="hourly">시급</option>
                          <option value="daily">일급</option>
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-600">기본 단가</label>
                        <input
                          {...register("default_pay_rate")}
                          type="number"
                          min={0}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition-all duration-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                          placeholder="10000"
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-600">계약금</label>
                      <input
                        {...register("contract_amount")}
                        type="number"
                        min={0}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition-all duration-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                        placeholder="300000"
                      />
                    </div>
                  )}
                </fieldset>

                <fieldset className="rounded-lg bg-slate-50 p-4">
                  <legend className="px-2 text-sm font-semibold text-slate-700">메모</legend>
                  <textarea
                    {...register("memo")}
                    rows={4}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition-all duration-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 resize-none"
                    placeholder="메모를 입력하세요."
                  />
                </fieldset>
              </div>
            </div>
          </div>

          <DialogFooter className="border-t px-6 py-4">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} className="transition-all duration-200 active:scale-95">
              취소
            </Button>
            <Button type="submit" disabled={isPending} className="transition-all duration-200 active:scale-95">
              {isPending ? "저장 중..." : existing ? "수정" : "등록"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
