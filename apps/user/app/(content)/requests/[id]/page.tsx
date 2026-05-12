import { notFound } from "next/navigation";
import { RequestDetailClient } from "@/components/requests/RequestDetailClient";
import { requireAuth } from "@/lib/auth";
import { getRequestDetailForUser } from "@/lib/requests";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function RequestDetailPage({ params }: PageProps) {
  const user = await requireAuth();
  const { id } = await params;
  const detail = await getRequestDetailForUser(id, user);
  if (!detail) notFound();
  return (
    <div className="p-4 md:p-6">
      <RequestDetailClient {...detail} currentUser={user} />
    </div>
  );
}
