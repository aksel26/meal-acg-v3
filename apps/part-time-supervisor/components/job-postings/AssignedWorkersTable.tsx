"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "@repo/ui/src/sonner";
import { FileCheck, Pencil, Trash2 } from "lucide-react";
import ContractApprovalDialog from "@/components/job-postings/ContractApprovalDialog";
import { ROOMS, getRoomById } from "@/lib/room-constants";
import { useAddRoomSlot, useDeleteRoomSlot } from "@/hooks/use-room-assignment-mutations";
import type { AssignmentWithDetails, JobPosting, Worker } from "@/lib/supabase/types";
import dayjs from "dayjs";
import { Popover, PopoverTrigger, PopoverContent } from "@repo/ui/src/popover";

const contractOptions = [
  { value: null, label: "계약 전", className: "bg-slate-100 text-slate-400" },
  { value: "signed" as const, label: "서명완료", className: "bg-yellow-100 text-yellow-700" },
  { value: "confirmed" as const, label: "확인완료", className: "bg-green-100 text-green-700" },
];

const attendanceOptions = [
  { value: null, label: "미출석", className: "bg-slate-100 text-slate-400" },
  { value: "checked_in" as const, label: "출석(확인대기)", className: "bg-amber-100 text-amber-700" },
  { value: "confirmed" as const, label: "출석확인완료", className: "bg-green-100 text-green-700" },
];

const genderLabel: Record<string, string> = {
  male: "남",
  female: "여",
};

function NoteInput({
  workerId,
  initialValue,
}: {
  workerId: string;
  initialValue: string;
}) {
  const [value, setValue] = useState(initialValue);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (note: string) => {
      const res = await fetch(`/api/workers/${workerId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: note || null }),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workers.all });
    },
  });

  const handleBlur = () => {
    if (value !== initialValue) {
      mutation.mutate(value);
    }
  };

  return (
    <input
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={handleBlur}
      className="w-full rounded border border-transparent bg-transparent px-2 py-1 text-sm transition-colors hover:border-slate-200 focus:border-indigo-300 focus:bg-white focus:outline-none"
      placeholder="특이사항 입력"
    />
  );
}

function RoomDropdown({
  assignmentId,
  currentRooms,
  job,
}: {
  assignmentId: string;
  currentRooms: string[];
  job: JobPosting;
}) {
  const [open, setOpen] = useState(false);
  const addSlot = useAddRoomSlot();
  const deleteSlot = useDeleteRoomSlot();

  const slotData = (room: string) => {
    const startTime = job.work_start || "09:00";
    const startHour = parseInt(startTime.split(":")[0] ?? "9", 10);
    const endTime = `${String(startHour + 1).padStart(2, "0")}:00`;
    return {
      assignment_id: assignmentId,
      date: job.start_date,
      start_time: startTime,
      end_time: endTime,
      room,
    };
  };

  const handleToggle = (roomId: string) => {
    if (currentRooms.includes(roomId)) {
      // 이미 선택된 룸 클릭 → 배정 해제
      deleteSlot.mutate(slotData(roomId));
    } else {
      // 다른 룸 선택 → replace로 교체
      addSlot.mutate({ ...slotData(roomId), replace: currentRooms.length > 0 });
    }
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex flex-wrap justify-center gap-1 rounded-md px-1 py-0.5 transition-colors hover:bg-slate-100 cursor-pointer min-w-[2rem]">
          {currentRooms.length === 0 ? (
            <span className="text-slate-400">-</span>
          ) : (
            currentRooms.map((roomId) => (
              <span key={roomId} className="inline-block rounded-sm bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                {getRoomById(roomId)?.name ?? roomId}
              </span>
            ))
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="center" className="w-44 p-1.5">
        <div className="space-y-0.5">
          {ROOMS.map((room) => {
            const checked = currentRooms.includes(room.id);
            return (
              <label
                key={room.id}
                className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs transition-colors hover:bg-slate-50 cursor-pointer ${
                  checked ? "bg-slate-50 font-semibold" : ""
                }`}
              >
                <input
                  type="radio"
                  name={`room-${assignmentId}`}
                  checked={checked}
                  onChange={() => handleToggle(room.id)}
                  className="h-3.5 w-3.5 accent-indigo-600"
                />
                {room.name}
              </label>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function AttendancePopover({
  assignmentId,
  currentStatus,
  confirmedBy,
  onChangeStatus,
}: {
  assignmentId: string;
  currentStatus: "checked_in" | "confirmed" | null;
  confirmedBy: string | null;
  onChangeStatus: (status: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = attendanceOptions.find((o) => o.value === currentStatus) ?? attendanceOptions[0]!;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="inline-flex items-center gap-1 rounded-sm px-2.5 py-0.5 text-xs font-medium transition-colors hover:ring-2 hover:ring-slate-200 cursor-pointer">
          <span className={`inline-block rounded-sm px-2.5 py-0.5 ${current.className}`}>
            {current.label}
          </span>
          {currentStatus === "confirmed" && confirmedBy && (
            <span className="text-[11px] text-slate-400">{confirmedBy}</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="center" className="w-44 p-1.5">
        <div className="space-y-0.5">
          {attendanceOptions.map((option) => (
            <button
              key={option.value ?? "null"}
              onClick={() => {
                if (option.value !== currentStatus) {
                  onChangeStatus(option.value);
                }
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs transition-colors hover:bg-slate-50 ${
                option.value === currentStatus ? "bg-slate-50 font-semibold" : ""
              }`}
            >
              <span className={`inline-block h-2 w-2 rounded-full ${option.value === null ? "bg-slate-300" : option.value === "checked_in" ? "bg-amber-400" : "bg-green-500"}`} />
              {option.label}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ContractPopover({
  assignmentId,
  currentStatus,
  confirmedBy,
  confirmedAt,
  onChangeStatus,
}: {
  assignmentId: string;
  currentStatus: "signed" | "confirmed" | null;
  confirmedBy: string | null;
  confirmedAt: string | null;
  onChangeStatus: (status: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = contractOptions.find((o) => o.value === currentStatus) ?? contractOptions[0]!;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="inline-flex items-center gap-1 rounded-sm px-2.5 py-0.5 text-xs font-medium transition-colors hover:ring-2 hover:ring-slate-200 cursor-pointer">
          <span className={`inline-block rounded-sm px-2.5 py-0.5 ${current.className}`}>
            {current.label}
          </span>
          {currentStatus === "confirmed" && confirmedBy && (
            <span className="text-[11px] text-slate-400">{confirmedBy}</span>
          )}
          {currentStatus === "confirmed" && confirmedAt && (
            <span className="text-[11px] text-slate-400">{dayjs(confirmedAt).format("MM.DD")}</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="center" className="w-44 p-1.5">
        <div className="space-y-0.5">
          {contractOptions.map((option) => (
            <button
              key={option.value ?? "null"}
              onClick={() => {
                if (option.value !== currentStatus) {
                  onChangeStatus(option.value);
                }
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs transition-colors hover:bg-slate-50 ${
                option.value === currentStatus ? "bg-slate-50 font-semibold" : ""
              }`}
            >
              <span className={`inline-block h-2 w-2 rounded-full ${option.value === null ? "bg-slate-300" : option.value === "signed" ? "bg-yellow-400" : "bg-green-500"}`} />
              {option.label}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default function AssignedWorkersTable({
  jobPostingId,
  job,
  assignments,
  isLoading,
  selectedIds = new Set(),
  onToggle,
  onEditWorker,
}: {
  jobPostingId: string;
  job: JobPosting;
  assignments: AssignmentWithDetails[];
  isLoading: boolean;
  selectedIds?: Set<string>;
  onToggle?: (id: string) => void;
  onEditWorker?: (worker: Worker) => void;
}) {
  const [approvalAssignment, setApprovalAssignment] = useState<AssignmentWithDetails | null>(null);
  const queryClient = useQueryClient();

  const contractMutation = useMutation({
    mutationFn: async ({ assignmentId, status }: { assignmentId: string; status: string | null }) => {
      const res = await fetch(`/api/assignments/${assignmentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contract_status: status,
          confirmed_at: status === "confirmed" ? new Date().toISOString() : null,
          confirmed_by: null,
        }),
      });
      if (!res.ok) throw new Error("Failed to update contract");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assignments.byJobPosting(jobPostingId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });

  const attendanceMutation = useMutation({
    mutationFn: async ({ assignmentId, status }: { assignmentId: string; status: string | null }) => {
      if (status === "confirmed") {
        const res = await fetch(`/api/assignments/${assignmentId}/confirm-attendance`, { method: "POST" });
        if (!res.ok) throw new Error("Failed to confirm attendance");
        return res.json();
      }
      // checked_in 또는 null (리셋)
      const res = await fetch(`/api/assignments/${assignmentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attendance_status: status,
          checked_in_at: status === "checked_in" ? new Date().toISOString() : null,
          attendance_confirmed_at: null,
          attendance_confirmed_by: null,
        }),
      });
      if (!res.ok) throw new Error("Failed to update attendance");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assignments.byJobPosting(jobPostingId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (assignmentId: string) => {
      const res = await fetch(`/api/assignments/${assignmentId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assignments.byJobPosting(jobPostingId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.jobPostings.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`"${name}" 지원자를 명단에서 삭제하시겠습니까?`)) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("삭제되었습니다.");
    } catch {
      toast.error("삭제에 실패했습니다.");
    }
  };

  if (isLoading) {
    return <div className="py-10 text-center text-sm text-slate-400">로딩 중...</div>;
  }

  if (!assignments.length) {
    return <div className="py-10 text-center text-sm text-slate-400">배정된 지원자가 없습니다.</div>;
  }

  return (
    <>
    <div className="overflow-x-auto rounded-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-white text-left whitespace-nowrap">
            {onToggle && (
              <th className="px-4 py-2 text-center" />
            )}
            <th className="px-2 py-2 font-medium text-center w-8">No.</th>
            <th className="px-4 py-2 font-medium">이름</th>
            <th className="px-4 py-2 font-medium">휴대전화번호</th>
            <th className="px-4 py-2 font-medium min-w-[160px]">이메일</th>
            <th className="px-4 py-2 font-medium text-center">성별</th>
            <th className="px-4 py-2 font-medium">경력</th>
            <th className="px-4 py-2 font-medium text-center">근무시간</th>
            <th className="px-4 py-2 font-medium">특이사항</th>
            <th className="px-4 py-2 font-medium text-center">회의실</th>
            <th className="px-4 py-2 font-medium text-center">출석</th>
            <th className="px-4 py-2 font-medium text-center">계약</th>
            <th className="px-4 py-2 font-medium">등록일</th>
            <th className="px-4 py-2 font-medium text-center w-10">수정</th>
            <th className="px-4 py-2 font-medium text-center w-10">삭제</th>
          </tr>
        </thead>
        <tbody>
          {assignments.map((a, idx) => {
            const worker = a.worker as AssignmentWithDetails["worker"] & {
              gender?: string | null;
              email?: string | null;
              experience?: string | null;
              work_start?: string | null;
              work_end?: string | null;
              note?: string | null;
              created_at?: string;
            };
            return (
              <tr key={a.id} className={`border-b last:border-0 hover:bg-slate-50/50 whitespace-nowrap ${selectedIds.has(a.id) ? "bg-blue-50/40" : "bg-white"}`}>
                {onToggle && (
                  <td className="px-4 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(a.id)}
                      onChange={() => onToggle(a.id)}
                      className="h-4 w-4 rounded border-slate-300 accent-blue-600"
                    />
                  </td>
                )}
                <td className="px-2 py-2 text-center text-slate-400">{idx + 1}</td>
                <td className="px-4 py-2 font-medium">{worker?.name || "-"}</td>
                <td className="px-4 py-2 text-slate-500">{worker?.phone || "-"}</td>
                <td className="px-4 py-2 text-slate-500 min-w-[160px]">{worker?.email || "-"}</td>
                <td className="px-4 py-2 text-center text-slate-500">
                  {worker?.gender ? genderLabel[worker.gender] || "-" : "-"}
                </td>
                <td className="px-4 py-2 text-slate-500">{worker?.experience || "-"}</td>
                <td className="px-4 py-2 text-center text-slate-500">
                  {worker?.work_start && worker?.work_end
                    ? `${worker.work_start.slice(0, 5)} ~ ${worker.work_end.slice(0, 5)}`
                    : "-"}
                </td>
                <td className="px-4 py-2 whitespace-normal">
                  {worker?.id ? (
                    <NoteInput workerId={worker.id} initialValue={worker.note || ""} />
                  ) : "-"}
                </td>
                <td className="px-4 py-2 text-center">
                  <RoomDropdown
                    assignmentId={a.id}
                    currentRooms={[...new Set((a.room_slots ?? []).map((s) => s.room))]}
                    job={job}
                  />
                </td>
                <td className="px-4 py-2 text-center">
                  <AttendancePopover
                    assignmentId={a.id}
                    currentStatus={a.attendance_status ?? null}
                    confirmedBy={a.attendance_confirmed_by ?? null}
                    onChangeStatus={(status) => {
                      attendanceMutation.mutate({ assignmentId: a.id, status });
                    }}
                  />
                </td>
                <td className="px-4 py-2 text-center">
                  <div className="inline-flex items-center gap-1">
                    <ContractPopover
                      assignmentId={a.id}
                      currentStatus={(a.contract_status as "signed" | "confirmed" | null) ?? null}
                      confirmedBy={a.confirmed_by ?? null}
                      confirmedAt={a.confirmed_at ?? null}
                      onChangeStatus={(status) => {
                        contractMutation.mutate({ assignmentId: a.id, status });
                      }}
                    />
                    {(a.contract_status === "signed" || a.contract_status === "confirmed") && (
                      <button
                        onClick={() => setApprovalAssignment(a)}
                        className="rounded-md p-1 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                        title="계약서 확인"
                      >
                        <FileCheck size={15} />
                      </button>
                    )}
                  </div>
                </td>
                <td className="px-4 py-2 text-xs text-slate-400">
                  {dayjs(a.assigned_at).format("YYYY.MM.DD")}
                </td>
                <td className="px-4 py-2 text-center">
                  {onEditWorker && worker?.id && (
                    <button
                      onClick={() => onEditWorker(worker as Worker)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-500"
                    >
                      <Pencil size={15} />
                    </button>
                  )}
                </td>
                <td className="px-4 py-2 text-center">
                  <button
                    onClick={() => handleDelete(a.id, worker?.name || "")}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500"
                  >
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>

    {approvalAssignment && (
      <ContractApprovalDialog
        assignment={approvalAssignment}
        job={job}
        onClose={() => setApprovalAssignment(null)}
        onConfirmed={() => setApprovalAssignment(null)}
      />
    )}
  </>
  );
}
