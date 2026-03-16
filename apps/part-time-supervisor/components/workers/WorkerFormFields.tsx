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
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/src/popover";
import { Calendar } from "@repo/ui/src/calendar";
import { CalendarIcon } from "lucide-react";
import { parse, isValid, format } from "date-fns";
import { ko } from "date-fns/locale";

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
    <div className="grid grid-cols-2 gap-6">
      {/* 왼쪽 열: 기본 정보 + 개인 정보 */}
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
              {control ? (
                <Controller
                  name="phone"
                  control={control}
                  render={({ field }) => (
                    <Input
                      id="phone"
                      value={field.value}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^0-9]/g, "");
                        let formatted = raw;
                        if (raw.length <= 3) {
                          formatted = raw;
                        } else if (raw.length <= 7) {
                          formatted = `${raw.slice(0, 3)}-${raw.slice(3)}`;
                        } else {
                          formatted = `${raw.slice(0, 3)}-${raw.slice(3, 7)}-${raw.slice(7, 11)}`;
                        }
                        field.onChange(formatted);
                      }}
                      placeholder="010-0000-0000"
                      maxLength={13}
                      className="mt-1.5"
                    />
                  )}
                />
              ) : (
                <Input
                  id="phone"
                  {...register("phone")}
                  placeholder="010-0000-0000"
                  className="mt-1.5"
                />
              )}
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
              <Label>생년월일</Label>
              {control ? (
                <Controller
                  name="birth_date"
                  control={control}
                  render={({ field }) => {
                    const parsed = field.value
                      ? parse(field.value, "yyyy-MM-dd", new Date())
                      : undefined;
                    const selectedDate = parsed && isValid(parsed) ? parsed : undefined;
                    return (
                      <div className="relative mt-1.5">
                        <Input
                          value={field.value}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/[^0-9]/g, "");
                            let formatted = raw;
                            if (raw.length <= 4) {
                              formatted = raw;
                            } else if (raw.length <= 6) {
                              formatted = `${raw.slice(0, 4)}-${raw.slice(4)}`;
                            } else {
                              formatted = `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
                            }
                            field.onChange(formatted);
                          }}
                          placeholder="YYYY-MM-DD"
                          maxLength={10}
                          className="pr-9"
                        />
                        <Popover>
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                              <CalendarIcon className="h-4 w-4" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={selectedDate}
                              defaultMonth={selectedDate}
                              onSelect={(date) => {
                                if (date) {
                                  field.onChange(format(date, "yyyy-MM-dd"));
                                }
                              }}
                              locale={ko}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    );
                  }}
                />
              ) : (
                <Input
                  id="birth_date"
                  type="date"
                  {...register("birth_date")}
                  className="mt-1.5"
                />
              )}
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
      </div>

      {/* 오른쪽 열: 계좌 정보 + 기타 */}
      <div className="space-y-5">
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
    </div>
  );
}
