import { AdminLibraryClient } from "@/components/library/AdminLibraryClient";
import { listLibraryAdminOverview } from "@/lib/library";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminLibraryPage() {
  const overview = await listLibraryAdminOverview();
  return <AdminLibraryClient initialData={overview} />;
}
