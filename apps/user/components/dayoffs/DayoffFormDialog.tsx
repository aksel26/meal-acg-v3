"use client";

import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/src/select";
import { Button } from "@repo/ui/src/button";
import { Label } from "@repo/ui/src/label";
import { DateRangePicker } from "@repo/ui/src/date-range-picker";
import { SearchableDropdown } from "@repo/ui/src/searchable-dropdown";
import { Textarea } from "@repo/ui/src/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/src/dialog";
import type { DayoffRecord, LeaveType, MemberOption, DayoffFormData } from "./types";
import { defaultFormData } from "./types";

interface DayoffFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingRecord: DayoffRecord | null;
  copySource: DayoffRecord | null;
  initialDate?: string;
  currentMemberId: string;
  currentUserName: string;
  members: MemberOption[];
  leaveTypes: LeaveType[];
  onSave: (formData: DayoffFormData) => void;
  isSaving: boolean;
}

export default function DayoffFormDialog({
  open,
  onOpenChange,
  editingRecord,
  copySource,
  initialDate,
  currentMemberId,
  currentUserName,
  members,
  leaveTypes,
  onSave,
  isSaving,
}: DayoffFormDialogProps) {
  const [formData, setFormData] = useState<DayoffFormData>(defaultFormData);

  useEffect(() => {
    if (!open) return;
    if (editingRecord) {
      setFormData({
        targetId: editingRecord.target_id,
        ccMemberIds: editingRecord.cc_member_ids || [],
        startDate: editingRecord.leave_date,
        endDate: editingRecord.leave_date,
        leaveTypeId: editingRecord.leave_type_id,
        lateHour: editingRecord.late_hour || "09",
        lateMinute: editingRecord.late_minute || "00",
        reason: editingRecord.reason || "",
      });
    } else if (copySource) {
      setFormData({
        targetId: currentMemberId,
        ccMemberIds: copySource.cc_member_ids || [],
        startDate: "",
        endDate: "",
        leaveTypeId: copySource.leave_type_id,
        lateHour: copySource.late_hour || "09",
        lateMinute: copySource.late_minute || "00",
        reason: copySource.reason || "",
      });
    } else {
      setFormData({
        ...defaultFormData,
        targetId: currentMemberId,
        startDate: initialDate || "",
        endDate: initialDate || "",
      });
    }
  }, [open, editingRecord, copySource, initialDate, currentMemberId]);

  const handleAddCcMember = (memberId: string) => {
    if (!memberId || formData.ccMemberIds.includes(memberId)) return;
    setFormData({ ...formData, ccMemberIds: [...formData.ccMemberIds, memberId] });
  };

  const handleRemoveCcMember = (memberId: string) => {
    setFormData({
      ...formData,
      ccMemberIds: formData.ccMemberIds.filter((id) => id !== memberId),
    });
  };

  const getMemberName = (id: string) =>
    members.find((m) => m.id === id)?.full_name || id;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-[oklch(0.20_0.02_250)]">
            {editingRecord ? "휴가 수정" : "휴가 신청"}
          </DialogTitle>
          <DialogDescription>
            {editingRecord
              ? "근태 정보를 수정합니다."
              : "주말/공휴일은 자동 제외됩니다."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-2">
          {/* 기안자 (read-only) */}
          <div className="space-y-1.5">
            <Label className="text-xs text-[oklch(0.50_0.01_250)]">
              기안자
            </Label>
            <div className="flex items-center h-9 px-3 rounded-md border border-[oklch(0.90_0.01_250)] bg-[oklch(0.97_0.005_250)] text-sm text-[oklch(0.30_0.02_250)]">
              {currentUserName || "-"}
            </div>
          </div>

          {/* 참조자 */}
          <div className="space-y-1.5">
            <Label className="text-xs text-[oklch(0.50_0.01_250)]">
              참조자
            </Label>
            <SearchableDropdown
              items={members.filter(
                (m) =>
                  m.id !== currentMemberId &&
                  !formData.ccMemberIds.includes(m.id)
              )}
              getItemKey={(m) => m.id}
              getItemLabel={(m) => m.full_name}
              onSelect={(m) => handleAddCcMember(m.id)}
              placeholder="참조자 선택"
              searchPlaceholder="이름 검색 (초성 가능)"
              className="w-full"
            />
            {formData.ccMemberIds.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {formData.ccMemberIds.map((id) => (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1.5 rounded-md border border-[#f3f3f3] bg-[#f9f9fa] px-2.5 py-1 text-[13px] font-medium text-slate-700"
                  >
                    {getMemberName(id)}
                    <button
                      type="button"
                      onClick={() => handleRemoveCcMember(id)}
                      className="text-slate-400 transition-colors hover:text-[#111111]"
                      aria-label={`${getMemberName(id)} 참조자 제거`}
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 날짜 (Range) */}
          <div className="space-y-1.5">
            <Label className="text-xs text-[oklch(0.50_0.01_250)]">기간</Label>
            <DateRangePicker
              startDate={formData.startDate}
              endDate={formData.endDate || formData.startDate}
              modal
              onChange={({ startDate, endDate }) =>
                setFormData({ ...formData, startDate, endDate })
              }
              disabled={!!editingRecord}
            />
          </div>

          {/* 구분 */}
          <div className="space-y-1.5">
            <Label className="text-xs text-[oklch(0.50_0.01_250)]">구분</Label>
            <Select
              value={
                formData.leaveTypeId ? formData.leaveTypeId.toString() : ""
              }
              onValueChange={(v) =>
                setFormData({ ...formData, leaveTypeId: parseInt(v) })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="근태 유형 선택" />
              </SelectTrigger>
              <SelectContent>
                {(() => {
                  const CATEGORY_ORDER = ["연차", "반차", "반반차", "대체", "경조", "휴무", "훈련", "보건휴가"];
                  const groups = leaveTypes.reduce<Record<string, typeof leaveTypes>>(
                    (acc, t) => {
                      const cat = t.category || "기타";
                      if (!acc[cat]) acc[cat] = [];
                      acc[cat].push(t);
                      return acc;
                    },
                    {}
                  );
                  return Object.entries(groups)
                    .filter(([cat]) => CATEGORY_ORDER.includes(cat))
                    .sort(([a], [b]) => CATEGORY_ORDER.indexOf(a) - CATEGORY_ORDER.indexOf(b))
                    .map(([category, types]) => (
                      <SelectGroup key={category}>
                        <SelectLabel>{category}</SelectLabel>
                        {types.map((t) => (
                          <SelectItem key={t.id} value={t.id.toString()}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ));
                })()}
              </SelectContent>
            </Select>
          </div>

          {/* 지각 시간 (조건부) */}
          {formData.leaveTypeId === 1 && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-[oklch(0.50_0.01_250)]">
                  시
                </Label>
                <Select
                  value={formData.lateHour}
                  onValueChange={(v) =>
                    setFormData({ ...formData, lateHour: v })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["09", "10", "11"].map((h) => (
                      <SelectItem key={h} value={h}>
                        {h}시
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-[oklch(0.50_0.01_250)]">
                  분
                </Label>
                <Select
                  value={formData.lateMinute}
                  onValueChange={(v) =>
                    setFormData({ ...formData, lateMinute: v })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) =>
                      String(i * 5).padStart(2, "0")
                    ).map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}분
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* 비고 */}
          <div className="space-y-1.5">
            <Label className="text-xs text-[oklch(0.50_0.01_250)]">비고</Label>
            <Textarea
              value={formData.reason}
              onChange={(e) =>
                setFormData({ ...formData, reason: e.target.value })
              }
              placeholder="비고 입력 (선택)"
              rows={2}
              className="text-sm"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            취소
          </Button>
          <Button
            onClick={() => onSave(formData)}
            disabled={isSaving}
            className="flex-1 rounded-lg bg-[#131313] hover:bg-[#2a2a2a] text-white"
          >
            {isSaving ? "저장 중..." : "저장"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
