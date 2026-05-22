import { AdminLockerClient } from "@/components/facilities/AdminLockerClient";
import { listLockerAdminOverview } from "@/lib/facilities";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminLockersPage() {
  const overview = await listLockerAdminOverview();
  return <AdminLockerClient initialData={overview} />;
}
