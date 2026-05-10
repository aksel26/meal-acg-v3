import { CreateRequestDialog } from "@/components/requests/CreateRequestDialog";
import { RequestList } from "@/components/requests/RequestList";
import { requireAuth } from "@/lib/auth";
import { listRequestsForUser } from "@/lib/requests";

export default async function MyRequestsPage() {
  const user = await requireAuth();
  const requests = await listRequestsForUser(user, "mine");

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#111111]">내 요청</h1>
          <p className="mt-1 text-sm text-slate-500">
            내가 등록한 요청 {requests.length}건
          </p>
        </div>
        <CreateRequestDialog />
      </div>

      <RequestList requests={requests} emptyText="아직 등록한 요청이 없습니다." />
    </div>
  );
}
