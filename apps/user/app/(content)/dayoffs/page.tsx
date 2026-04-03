"use client";

import { useState, useMemo } from "react";
import { motion } from "motion/react";
import dayjs from "dayjs";
import "dayjs/locale/ko";
import { toast } from "@repo/ui/src/sonner";
import { useUserStore } from "@/stores/userStore";
import { useMemberIdLookup } from "@/hooks/use-points-data";
import { useDayoffs, useLeaveTypes } from "@/hooks/use-dayoffs";
import type { DayoffRecord } from "@/hooks/use-dayoffs";
import {
  useCreateDayoff,
  useUpdateDayoff,
  useDeleteDayoff,
  useApproveDayoff,
} from "@/hooks/use-dayoff-mutations";
import { useQuery } from "@tanstack/react-query";
import type { MemberOption, DayoffFormData } from "@/components/dayoffs/types";
import DayoffsDesktopView from "@/components/dayoffs/DayoffsDesktopView";
import DayoffsMobileView from "@/components/dayoffs/DayoffsMobileView";
import DayoffFormDialog from "@/components/dayoffs/DayoffFormDialog";
import DayoffDeleteDialog from "@/components/dayoffs/DayoffDeleteDialog";

dayjs.locale("ko");

export default function DayoffsPage() {
  const { userName } = useUserStore();
  const { data: memberInfo } = useMemberIdLookup(userName);
  const memberId = memberInfo?.id || "";

  const now = dayjs();
  const [year, setYear] = useState(now.year());
  const [month, setMonth] = useState(now.month() + 1);
  const [selectedDate, setSelectedDate] = useState<string | null>(
    now.format("YYYY-MM-DD")
  );

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<DayoffRecord | null>(null);
  const [copySource, setCopySource] = useState<DayoffRecord | null>(null);
  const [initialDate, setInitialDate] = useState<string>("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // 내 휴가 내역만 조회
  const { data: dayoffs, isLoading } = useDayoffs(year, month, memberId || undefined);
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
  const approveMutation = useApproveDayoff();

  const categories = useMemo(() => {
    if (!leaveTypes) return ["전체"];
    const unique = [...new Set(leaveTypes.map((t) => t.category))];
    return ["전체", ...unique];
  }, [leaveTypes]);

  const handleMonthChange = (newYear: number, newMonth: number) => {
    setYear(newYear);
    setMonth(newMonth);
    setSelectedDate(null);
  };

  const handleCreateNew = (date?: string) => {
    setEditingRecord(null);
    setCopySource(null);
    setInitialDate(date || "");
    setIsDialogOpen(true);
  };

  const handleEdit = (record: DayoffRecord) => {
    if (record.approver_id) {
      toast.error("승인된 근태는 수정할 수 없습니다.");
      return;
    }
    setEditingRecord(record);
    setCopySource(null);
    setInitialDate("");
    setIsDialogOpen(true);
  };

  const handleCopy = (record: DayoffRecord) => {
    setEditingRecord(null);
    setCopySource(record);
    setInitialDate("");
    setIsDialogOpen(true);
  };

  const handleDeleteClick = (record: DayoffRecord) => {
    if (record.approver_id) {
      toast.error("승인된 근태는 삭제할 수 없습니다.");
      return;
    }
    setDeleteTarget(record.id);
  };

  const handleApprove = (record: DayoffRecord) => {
    approveMutation.mutate({ id: record.id, approverId: memberId });
  };

  const handleSave = (formData: DayoffFormData) => {
    if (!formData.startDate || !formData.leaveTypeId) {
      toast.error("날짜, 근태 유형을 입력해주세요.");
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
          ccMemberIds: formData.ccMemberIds,
          reason: formData.reason,
        },
        { onSuccess: () => setIsDialogOpen(false) }
      );
    } else {
      createMutation.mutate(
        {
          authorId: memberId,
          targetId: memberId,
          startDate: formData.startDate,
          endDate: formData.endDate || formData.startDate,
          leaveTypeId: formData.leaveTypeId,
          lateHour: formData.lateHour,
          lateMinute: formData.lateMinute,
          ccMemberIds: formData.ccMemberIds,
          reason: formData.reason,
        },
        { onSuccess: () => setIsDialogOpen(false) }
      );
    }
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget, {
      onSuccess: () => setDeleteTarget(null),
    });
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="md:hidden">
          <DayoffsMobileView
            year={year}
            month={month}
            onMonthChange={handleMonthChange}
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
            records={dayoffs || []}
            isLoading={isLoading}
            onEdit={handleEdit}
            onDelete={handleDeleteClick}
            onApprove={handleApprove}
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
            onDateSelect={setSelectedDate}
            records={dayoffs || []}
            categories={categories}
            isLoading={isLoading}
            onEdit={handleEdit}
            onDelete={handleDeleteClick}
            onApprove={handleApprove}
            onCopy={handleCopy}
            onCreateNew={handleCreateNew}
          />
        </div>
      </motion.div>

      <DayoffFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        editingRecord={editingRecord}
        copySource={copySource}
        initialDate={initialDate}
        currentMemberId={memberId}
        currentUserName={userName || ""}
        members={members || []}
        leaveTypes={leaveTypes || []}
        onSave={handleSave}
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
}
