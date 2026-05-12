import { CreateRequestDialog } from "@/components/requests/CreateRequestDialog";
import { RequestList } from "@/components/requests/RequestList";
import { requireAuth } from "@/lib/auth";
import { listRequestsForUser } from "@/lib/requests";

export default async function QueuePage() {
  const user = await requireAuth();
  const requests = await listRequestsForUser(user, "queue");

  const sorted = [...requests].sort((a, b) => {
    const aDone = a.status === "완료" || a.status === "거절" ? 1 : 0;
    const bDone = b.status === "완료" || b.status === "거절" ? 1 : 0;
    if (aDone !== bDone) return aDone - bDone;

    const aDue = a.due_date ?? "";
    const bDue = b.due_date ?? "";
    if (aDue && bDue) return aDue.localeCompare(bDue);
    if (aDue) return -1;
    if (bDue) return 1;
    return b.created_at.localeCompare(a.created_at);
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#111111]">내 요청 목록</h1>
          <p className="mt-1 text-sm text-slate-500">
            내가 담당자로 지정된 요청 {sorted.length}건
          </p>
        </div>
        <CreateRequestDialog />
      </div>

      <RequestList
        requests={sorted}
        emptyText="현재 담당 중인 요청이 없습니다."
      />
    </div>
  );
}
