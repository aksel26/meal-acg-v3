import { AdminLibraryClient } from "@/components/library/AdminLibraryClient";
import { requireAdminPermission } from "@/lib/auth";
import { listLibraryAdminOverview } from "@/lib/library";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminLibraryPage() {
  await requireAdminPermission("library:read");
  const overview = await listLibraryAdminOverview();
  return <AdminLibraryClient initialData={overview} />;
}
