import { CareersShell } from "@/components/CareersShell";
import { requireCareersAdmin } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireCareersAdmin();
  return <CareersShell user={admin}>{children}</CareersShell>;
}
