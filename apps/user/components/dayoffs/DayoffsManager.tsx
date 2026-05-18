"use client";

import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import "dayjs/locale/ko";
import { useQuery } from "@tanstack/react-query";
import { toast } from "@repo/ui/src/sonner";
import { useUserStore } from "@/stores/userStore";
import { useMemberIdLookup } from "@/hooks/use-points-data";
import {
  useDayoffs,
  useDayoffsYearly,
  useLeaveTypes,
} from "@/hooks/use-dayoffs";
import { useLeaveBalances } from "@/hooks/use-leave-balances";
import type { DayoffRecord } from "@/hooks/use-dayoffs";
import {
  useCreateDayoff,
  useDeleteDayoff,
  useUpdateDayoff,
} from "@/hooks/use-dayoff-mutations";
import type { DayoffFormData, MemberOption } from "@/components/dayoffs/types";
import DayoffDeleteDialog from "@/components/dayoffs/DayoffDeleteDialog";
import DayoffFormDialog from "@/components/dayoffs/DayoffFormDialog";
import DayoffsDesktopView from "@/components/dayoffs/DayoffsDesktopView";
import DayoffsMobileView from "@/components/dayoffs/DayoffsMobileView";

dayjs.locale("ko");

interface DayoffsManagerProps {
  year?: number;
  month?: number;
  selectedDate?: string | null;
  createDateRequest?: {
    startDate: string;
    endDate?: string;
    requestId: number;
  } | null;
  editRecordRequest?: { record: DayoffRecord; requestId: number } | null;
  dialogsOnly?: boolean;
  onMonthChange?: (year: number, month: number) => void;
  onDateSelect?: (date: string) => void;
}

export default function DayoffsManager({
  year: controlledYear,
  month: controlledMonth,
  selectedDate: controlledSelectedDate,
  createDateRequest,
  editRecordRequest,
  dialogsOnly = false,
  onMonthChange,
  onDateSelect,
}: DayoffsManagerProps = {}) {
  const { userName } = useUserStore();
  const { data: memberInfo } = useMemberIdLookup(userName);
  const memberId = memberInfo?.id || "";

  const now = dayjs();
  const [internalYear, setInternalYear] = useState(now.year());
  const [internalMonth, setInternalMonth] = useState(now.month() + 1);
  const [internalSelectedDate, setInternalSelectedDate] = useState<string | null>(
    now.format("YYYY-MM-DD"),
  );
  const year = controlledYear ?? internalYear;
  const month = controlledMonth ?? internalMonth;
  const selectedDate = controlledSelectedDate ?? internalSelectedDate;

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<DayoffRecord | null>(null);
  const [copySource, setCopySource] = useState<DayoffRecord | null>(null);
  const [initialDate, setInitialDate] = useState("");
  const [initialEndDate, setInitialEndDate] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const { data: dayoffs, isLoading } = useDayoffs(
    year,
    month,
    memberId || undefined,
  );
  const { data: yearlyDayoffs, isLoading: yearlyLoading } = useDayoffsYearly(
    memberId || null,
    year,
  );
  const { data: leaveBalances } = useLeaveBalances(memberId || null, year);
  const { data: leaveTypes } = useLeaveTypes();

  const { data: members } = useQuery<MemberOption[]>({
    queryKey: ["points", "members"],
    queryFn: async () => {
      const res = await fetch("/api/points/members");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const createMutation = useCreateDayoff();
  const updateMutation = useUpdateDayoff();
  const deleteMutation = useDeleteDayoff();

  const categories = useMemo(() => {
    if (!leaveTypes) return ["전체"];
    const unique = [...new Set(leaveTypes.map((t) => t.category))];
    return ["전체", ...unique];
  }, [leaveTypes]);

  const handleMonthChange = (newYear: number, newMonth: number) => {
    if (onMonthChange) {
      onMonthChange(newYear, newMonth);
    } else {
      setInternalYear(newYear);
      setInternalMonth(newMonth);
    }
    if (!onDateSelect) setInternalSelectedDate(null);
  };

  const handleDateSelect = (date: string) => {
    if (onDateSelect) {
      onDateSelect(date);
    } else {
      setInternalSelectedDate(date);
    }
  };

  const handleCreateNew = (date?: string) => {
    setEditingRecord(null);
    setCopySource(null);
    setInitialDate(date || "");
    setInitialEndDate(date || "");
    setIsDialogOpen(true);
  };

  const handleCreateRange = (startDate: string, endDate: string) => {
    setEditingRecord(null);
    setCopySource(null);
    setInitialDate(startDate);
    setInitialEndDate(endDate);
    setIsDialogOpen(true);
  };

  useEffect(() => {
    if (!createDateRequest) return;
    handleCreateRange(
      createDateRequest.startDate,
      createDateRequest.endDate || createDateRequest.startDate,
    );
  }, [createDateRequest]);

  const handleEdit = (record: DayoffRecord) => {
    setEditingRecord(record);
    setCopySource(null);
    setInitialDate("");
    setInitialEndDate("");
    setIsDialogOpen(true);
  };

  useEffect(() => {
    if (!editRecordRequest) return;
    handleEdit(editRecordRequest.record);
  }, [editRecordRequest]);

  const handleCopy = (record: DayoffRecord) => {
    setEditingRecord(null);
    setCopySource(record);
    setInitialDate("");
    setInitialEndDate("");
    setIsDialogOpen(true);
  };

  const handleDeleteClick = (record: DayoffRecord) => {
    setDeleteTarget(record.id);
  };

  const handleSave = (formData: DayoffFormData) => {
    if (!formData.startDate || !formData.leaveTypeId) {
      toast.error("날짜, 근태 유형을 입력해주세요.");
      return;
    }

    if (editingRecord?.approver_id && !formData.editReason.trim()) {
      toast.error("승인된 근태 수정 시 수정 사유를 입력해주세요.");
      return;
    }

    if (editingRecord) {
      updateMutation.mutate(
        {
          id: editingRecord.id,
          editorId: memberId,
          leaveDate: formData.startDate,
          leaveTypeId: formData.leaveTypeId,
          lateHour: formData.lateHour,
          lateMinute: formData.lateMinute,
          approverId: formData.approverIds[0] || "",
          ccMemberIds: formData.ccMemberIds,
          reason: formData.reason,
          editReason: formData.editReason,
        },
        { onSuccess: () => setIsDialogOpen(false) },
      );
      return;
    }

    createMutation.mutate(
      {
        authorId: memberId,
        targetId: memberId,
        startDate: formData.startDate,
        endDate: formData.endDate || formData.startDate,
        leaveTypeId: formData.leaveTypeId,
        lateHour: formData.lateHour,
        lateMinute: formData.lateMinute,
        approverId: formData.approverIds[0] || "",
        ccMemberIds: formData.ccMemberIds,
        reason: formData.reason,
      },
      { onSuccess: () => setIsDialogOpen(false) },
    );
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget, {
      onSuccess: () => setDeleteTarget(null),
    });
  };

  const dialogs = (
    <>

      <DayoffFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        editingRecord={editingRecord}
        copySource={copySource}
        initialDate={initialDate}
        initialEndDate={initialEndDate}
        currentMemberId={memberId}
        currentUserName={userName || ""}
        members={members || []}
        leaveTypes={leaveTypes || []}
        onSave={handleSave}
        onDelete={(record) => {
          setIsDialogOpen(false);
          handleDeleteClick(record);
        }}
        isSaving={createMutation.isPending || updateMutation.isPending}
      />

      <DayoffDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={handleDelete}
        isDeleting={deleteMutation.isPending}
      />
    </>
  );

  if (dialogsOnly) {
    return dialogs;
  }

  return (
    <>
      <div className="md:hidden">
        <DayoffsMobileView
          year={year}
          month={month}
          onMonthChange={handleMonthChange}
          selectedDate={selectedDate}
          onDateSelect={handleDateSelect}
          records={dayoffs || []}
          isLoading={isLoading}
          onEdit={handleEdit}
          onDelete={handleDeleteClick}
          onCopy={handleCopy}
          onCreateNew={handleCreateNew}
        />
      </div>

      <div className="max-md:hidden">
        <DayoffsDesktopView
          year={year}
          month={month}
          onMonthChange={handleMonthChange}
          selectedDate={selectedDate}
          onDateSelect={handleDateSelect}
          records={dayoffs || []}
          yearlyRecords={yearlyDayoffs || []}
          leaveTypes={leaveTypes || []}
          leaveBalances={leaveBalances || []}
          hireDate={memberInfo?.hire_date || null}
          categories={categories}
          isLoading={isLoading}
          yearlyLoading={yearlyLoading}
          onEdit={handleEdit}
          onCreateNew={handleCreateNew}
        />
      </div>

      {dialogs}
    </>
  );
}
