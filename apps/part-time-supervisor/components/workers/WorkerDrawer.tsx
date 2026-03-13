"use client";

import { useState } from "react";
import { useWorker } from "@/hooks/use-workers";
import ContractImageDialog from "./SignatureDialog";
import { X, ChevronDown, ChevronUp, FileText } from "lucide-react";

const statusLabel: Record<string, string> = {
  registered: "등록",
  contracted: "계약",
  working: "근무중",
  completed: "완료",
};

const assignmentStatusLabel: Record<string, string> = {
  assigned: "배정",
  working: "근무중",
  completed: "완료",
  cancelled: "취소",
};

const contractStatusLabel: Record<string, string> = {
  signed: "서명완료",
  confirmed: "확인완료",
};

const attendanceStatusLabel: Record<string, string> = {
  checked_in: "출근",
  confirmed: "확인완료",
};

function formatDateTime(dt: string | null) {
  if (!dt) return "-";
  return new Date(dt).toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(dt: string | null) {
  if (!dt) return "-";
  return new Date(dt).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export default function WorkerDrawer({
  workerId,
  onClose,
  onEdit,
}: {
  workerId: string | null;
  onClose: () => void;
  onEdit: () => void;
}) {
  const { data: worker, isLoading } = useWorker(workerId);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [contractTarget, setContractTarget] = useState<string | null>(null);

  if (!workerId) return null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white shadow-xl">
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <h3 className="text-lg font-semibold">지원자 상세</h3>
            <button onClick={onClose} className="rounded-lg p-1 hover:bg-slate-100">
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4">
            {isLoading ? (
              <div className="py-10 text-center text-sm text-slate-400">로딩 중...</div>
            ) : worker ? (
              <div className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold">인적사항</h4>
                    <button
                      onClick={onEdit}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      수정
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-slate-400">이름</span>
                      <p className="font-medium">{worker.name}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">상태</span>
                      <p className="font-medium">{statusLabel[worker.status]}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">연락처</span>
                      <p className="font-medium">{worker.phone || "-"}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">생년월일</span>
                      <p className="font-medium">{worker.birth_date || "-"}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">은행</span>
                      <p className="font-medium">{worker.bank_name || "-"}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">계좌번호</span>
                      <p className="font-medium">{worker.account_number || "-"}</p>
                    </div>
                  </div>
                  {worker.note && (
                    <div className="text-sm">
                      <span className="text-slate-400">메모</span>
                      <p className="mt-0.5 whitespace-pre-wrap">{worker.note}</p>
                    </div>
                  )}
                </div>

                <hr />

                <div className="space-y-3">
                  <h4 className="text-sm font-semibold">배정 이력</h4>
                  {worker.assignments?.length ? (
                    <div className="space-y-2">
                      {worker.assignments.map((a) => {
                        const isExpanded = expandedId === a.id;
                        return (
                          <div key={a.id} className="rounded-lg border">
                            <button
                              type="button"
                              onClick={() => setExpandedId(isExpanded ? null : a.id)}
                              className="flex w-full items-center justify-between px-3 py-2.5 text-left text-xs hover:bg-slate-50"
                            >
                              <div className="flex flex-col gap-1">
                                <span className="font-medium">{a.job_posting?.title || "삭제된 공고"}</span>
                                <div className="flex items-center gap-2 text-slate-400">
                                  <span>{formatDate(a.assigned_at)}</span>
                                  {a.contract_status && (
                                    <span className="rounded-full bg-blue-50 px-1.5 py-0.5 text-blue-600">
                                      {contractStatusLabel[a.contract_status]}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">
                                  {assignmentStatusLabel[a.status]}
                                </span>
                                {isExpanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                              </div>
                            </button>
                            {isExpanded && (
                              <div className="border-t px-3 py-2.5 text-xs">
                                <div className="grid grid-cols-2 gap-y-2">
                                  <div>
                                    <span className="text-slate-400">배정 상태</span>
                                    <p className="font-medium">{assignmentStatusLabel[a.status]}</p>
                                  </div>
                                  <div>
                                    <span className="text-slate-400">계약 상태</span>
                                    <p className="font-medium">{a.contract_status ? contractStatusLabel[a.contract_status] : "-"}</p>
                                  </div>
                                  <div>
                                    <span className="text-slate-400">서명일</span>
                                    <p className="font-medium">{formatDateTime(a.signed_at)}</p>
                                  </div>
                                  <div>
                                    <span className="text-slate-400">확인일</span>
                                    <p className="font-medium">{formatDateTime(a.confirmed_at)}</p>
                                  </div>
                                  <div>
                                    <span className="text-slate-400">출근 상태</span>
                                    <p className="font-medium">{a.attendance_status ? attendanceStatusLabel[a.attendance_status] : "-"}</p>
                                  </div>
                                  <div>
                                    <span className="text-slate-400">출근 시간</span>
                                    <p className="font-medium">{formatDateTime(a.checked_in_at)}</p>
                                  </div>
                                </div>
                                {(() => {
                                  const contract = worker.contracts?.find((c) => c.assignment_id === a.id);
                                  return contract ? (
                                    <button
                                      type="button"
                                      onClick={() => setContractTarget(contract.id)}
                                      className="mt-2.5 flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-blue-600 hover:bg-blue-50"
                                    >
                                      <FileText size={13} />
                                      계약서 보기
                                    </button>
                                  ) : null;
                                })()}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">배정 이력이 없습니다.</p>
                  )}
                </div>

                {contractTarget && (
                  <ContractImageDialog
                    contractId={contractTarget}
                    open={!!contractTarget}
                    onClose={() => setContractTarget(null)}
                  />
                )}
              </div>
            ) : (
              <div className="py-10 text-center text-sm text-slate-400">지원자를 찾을 수 없습니다.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
