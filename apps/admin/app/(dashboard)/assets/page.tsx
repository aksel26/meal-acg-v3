import { AdminAssetRegisterClient } from "@/components/assets/AdminAssetRegisterClient";
import { listAssetRegisterOverview } from "@/lib/assets";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminAssetsPage() {
  const { assets, memberStatuses } = await listAssetRegisterOverview();

  return (
    <div className="space-y-5">
      <AdminAssetRegisterClient assets={assets} memberStatuses={memberStatuses} />
    </div>
  );
}
