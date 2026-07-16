import { CreateRequestDialog } from "@/components/requests/CreateRequestDialog";
import { RequestList } from "@/components/requests/RequestList";
import { requireAuth } from "@/lib/auth";
import { listRequestsForUser } from "@/lib/requests";

export default async function RequestsPage() {
  const user = await requireAuth();
  const requests = await listRequestsForUser(user, "all");

  return (
    <div className="space-y-5 p-4 md:p-6">
      <div className="flex justify-end">
        <CreateRequestDialog />
      </div>
      <RequestList requests={requests} emptyText="표시할 요청이 없습니다." />
    </div>
  );
}
