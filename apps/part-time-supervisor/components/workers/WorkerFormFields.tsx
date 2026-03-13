"use client";

import type { UseFormRegister, FieldErrors } from "react-hook-form";
import type { Worker } from "@/lib/supabase/types";

export type WorkerFormData = {
  name: string;
  phone: string;
  email: string;
  birth_date: string;
  gender: string;
  address: string;
  experience: string;
  warning: string;
  bank_name: string;
  account_number: string;
  status: Worker["status"];
  note: string;
};

export const workerFormDefaults: WorkerFormData = {
  name: "",
  phone: "",
  email: "",
  birth_date: "",
  gender: "",
  address: "",
  experience: "",
  warning: "",
  bank_name: "",
  account_number: "",
  status: "registered",
  note: "",
};

export default function WorkerFormFields({
  register,
  errors,
  showStatus = false,
}: {
  register: UseFormRegister<WorkerFormData>;
  errors: FieldErrors<WorkerFormData>;
  showStatus?: boolean;
}) {
  return (
    <>
      <div>
        <label className="mb-1 block text-sm font-medium">이름 *</label>
        <input
          {...register("name", { required: "이름을 입력하세요" })}
          className="w-full rounded-lg border px-3 py-2 text-sm"
        />
        {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">연락처</label>
        <input
          {...register("phone")}
          className="w-full rounded-lg border px-3 py-2 text-sm"
          placeholder="010-0000-0000"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">이메일</label>
        <input
          type="email"
          {...register("email")}
          className="w-full rounded-lg border px-3 py-2 text-sm"
          placeholder="example@email.com"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium">생년월일</label>
          <input
            type="date"
            {...register("birth_date")}
            className="w-full rounded-lg border px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">성별</label>
          <select
            {...register("gender")}
            className="w-full rounded-lg border px-3 py-2 text-sm"
          >
            <option value="">선택 안함</option>
            <option value="male">남</option>
            <option value="female">여</option>
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">주소</label>
        <input
          {...register("address")}
          className="w-full rounded-lg border px-3 py-2 text-sm"
          placeholder="주소 입력"
        />
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
          <label className="mb-1 block text-sm font-medium">계좌번호</label>
          <input
            {...register("account_number")}
            className="w-full rounded-lg border px-3 py-2 text-sm"
            placeholder="계좌번호"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium">경력(회차)</label>
          <input
            {...register("experience")}
            className="w-full rounded-lg border px-3 py-2 text-sm"
            placeholder="예: 3회차"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">경고</label>
          <input
            {...register("warning")}
            className="w-full rounded-lg border px-3 py-2 text-sm"
            placeholder="경고 사항"
          />
        </div>
      </div>

      {showStatus && (
        <div>
          <label className="mb-1 block text-sm font-medium">상태</label>
          <select
            {...register("status")}
            className="w-full rounded-lg border px-3 py-2 text-sm"
          >
            <option value="registered">등록</option>
            <option value="contracted">계약</option>
            <option value="working">근무중</option>
            <option value="completed">완료</option>
          </select>
        </div>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium">메모</label>
        <textarea
          {...register("note")}
          rows={2}
          className="w-full rounded-lg border px-3 py-2 text-sm"
        />
      </div>
    </>
  );
}
