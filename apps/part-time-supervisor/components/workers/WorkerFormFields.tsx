"use client";

import type { UseFormRegister, FieldErrors, Control } from "react-hook-form";
import { Controller } from "react-hook-form";
import type { Worker } from "@/lib/supabase/types";
import { Input } from "@repo/ui/src/input";
import { Label } from "@repo/ui/src/label";
import { Textarea } from "@repo/ui/src/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/src/select";

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

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
      {children}
    </p>
  );
}

export default function WorkerFormFields({
  register,
  errors,
  control,
  showStatus = false,
}: {
  register: UseFormRegister<WorkerFormData>;
  errors: FieldErrors<WorkerFormData>;
  control?: Control<WorkerFormData>;
  showStatus?: boolean;
}) {
  return (
    <div className="space-y-5">
      {/* 기본 정보 */}
      <div className="space-y-3">
        <SectionLabel>기본 정보</SectionLabel>
        <div>
          <Label htmlFor="name">이름 *</Label>
          <Input
            id="name"
            {...register("name", { required: "이름을 입력하세요" })}
            className="mt-1.5"
          />
          {errors.name && (
            <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="phone">연락처</Label>
            <Input
              id="phone"
              {...register("phone")}
              placeholder="010-0000-0000"
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="email">이메일</Label>
            <Input
              id="email"
              type="email"
              {...register("email")}
              placeholder="example@email.com"
              className="mt-1.5"
            />
          </div>
        </div>
      </div>

      {/* 개인 정보 */}
      <div className="space-y-3">
        <SectionLabel>개인 정보</SectionLabel>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="birth_date">생년월일</Label>
            <Input
              id="birth_date"
              type="date"
              {...register("birth_date")}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label>성별</Label>
            {control ? (
              <Controller
                name="gender"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="mt-1.5 w-full">
                      <SelectValue placeholder="선택 안함" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">선택 안함</SelectItem>
                      <SelectItem value="male">남</SelectItem>
                      <SelectItem value="female">여</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            ) : (
              <select
                {...register("gender")}
                className="mt-1.5 flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">선택 안함</option>
                <option value="male">남</option>
                <option value="female">여</option>
              </select>
            )}
          </div>
        </div>
        <div>
          <Label htmlFor="address">주소</Label>
          <Input
            id="address"
            {...register("address")}
            placeholder="주소 입력"
            className="mt-1.5"
          />
        </div>
      </div>

      {/* 계좌 정보 */}
      <div className="space-y-3">
        <SectionLabel>계좌 정보</SectionLabel>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="bank_name">은행</Label>
            <Input
              id="bank_name"
              {...register("bank_name")}
              placeholder="은행명"
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="account_number">계좌번호</Label>
            <Input
              id="account_number"
              {...register("account_number")}
              placeholder="계좌번호"
              className="mt-1.5"
            />
          </div>
        </div>
      </div>

      {/* 기타 */}
      <div className="space-y-3">
        <SectionLabel>기타</SectionLabel>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="experience">경력(회차)</Label>
            <Input
              id="experience"
              {...register("experience")}
              placeholder="예: 3회차"
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="warning">경고</Label>
            <Input
              id="warning"
              {...register("warning")}
              placeholder="경고 사항"
              className="mt-1.5"
            />
          </div>
        </div>

        {showStatus && control && (
          <div>
            <Label>상태</Label>
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="mt-1.5 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="registered">등록</SelectItem>
                    <SelectItem value="contracted">계약</SelectItem>
                    <SelectItem value="working">근무중</SelectItem>
                    <SelectItem value="completed">완료</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        )}

        <div>
          <Label htmlFor="note">메모</Label>
          <Textarea
            id="note"
            {...register("note")}
            rows={2}
            className="mt-1.5"
          />
        </div>
      </div>
    </div>
  );
}
