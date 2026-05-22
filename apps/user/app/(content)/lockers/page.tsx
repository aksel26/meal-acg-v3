import { UserLockerClient } from "@/components/facilities/UserLockerClient";
import { requireAuth } from "@/lib/auth";
import { listLockersForUser } from "@/lib/facilities";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function LockersPage() {
  const session = await requireAuth();
  const data = await listLockersForUser(session);

  return (
    <div>
      <UserLockerClient initialData={data} />
    </div>
  );
}
