import { UserBoardingTabs } from "@/components/operations/UserBoardingTabs";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function BoardingPage() {
  await requireAuth();
  return <UserBoardingTabs />;
}
