import { UserLibraryClient } from "@/components/library/UserLibraryClient";
import { requireAuth } from "@/lib/auth";
import { listLibraryForUser } from "@/lib/library";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function LibraryPage() {
  const session = await requireAuth();
  const data = await listLibraryForUser(session);

  return <UserLibraryClient initialData={data} userName={session.fullName} />;
}
