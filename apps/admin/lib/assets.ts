import { createClient } from "@supabase/supabase-js";

import { requireAdminPermission } from "@/lib/auth";
import {
  type AssetImageRecord,
  type AssetMemberStatus,
  type AssetRecord,
  type AssetRegisterOverview,
  type AssetSummary,
} from "@/lib/assets-types";
import { createServiceClient } from "@/lib/supabase/server";

type MemberRecord = {
  id: string;
  full_name: string;
  member_role: string | null;
  teams: { name: string | null } | { name: string | null }[] | null;
};

const ASSET_BUCKET = "asset-images";

function createWorkClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase environment variables not configured");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    db: { schema: "work" },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function listAssetRegisterOverview(): Promise<AssetRegisterOverview> {
  await requireAdminPermission("meal:read");

  const [assets, members] = await Promise.all([listAssets(), listMembers()]);
  return {
    assets,
    memberStatuses: buildMemberStatuses(members, assets),
  };
}

async function listAssets(): Promise<AssetSummary[]> {
  const supabase = createWorkClient();
  const { data, error } = await supabase
    .from("assets")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  const assets = (data ?? []) as AssetRecord[];
  if (assets.length === 0) return [];

  const { data: imageData, error: imageError } = await supabase
    .from("asset_images")
    .select("*")
    .in(
      "asset_id",
      assets.map((asset) => asset.id),
    )
    .order("created_at", { ascending: true });

  if (imageError) {
    throw imageError;
  }

  const hydratedImages = await Promise.all(
    ((imageData ?? []) as AssetImageRecord[]).map(async (image) => ({
      ...image,
      signed_url: await getAssetImageSignedUrl(image.storage_path),
    })),
  );

  const imagesByAsset = new Map<string, AssetImageRecord[]>();
  for (const image of hydratedImages) {
    const currentImages = imagesByAsset.get(image.asset_id) ?? [];
    currentImages.push(image);
    imagesByAsset.set(image.asset_id, currentImages);
  }

  return assets.map((asset) => {
    const images = imagesByAsset.get(asset.id) ?? [];
    return {
      ...asset,
      images,
      primary_image: images.find((image) => image.is_primary) ?? null,
    };
  });
}

async function listMembers(): Promise<MemberRecord[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("members")
    .select("id, full_name, member_role, teams(name)")
    .order("full_name");

  if (error) {
    throw error;
  }

  return (data ?? []) as unknown as MemberRecord[];
}

async function getAssetImageSignedUrl(path: string): Promise<string | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase.storage
    .from(ASSET_BUCKET)
    .createSignedUrl(path, 3600);

  if (error) {
    console.error(`getSignedUrl[${ASSET_BUCKET}] error for "${path}":`, error.message);
    return null;
  }

  return data.signedUrl;
}

function buildMemberStatuses(
  members: MemberRecord[],
  assets: AssetSummary[],
): AssetMemberStatus[] {
  return members.map((member) => {
    const userAssets = assets.filter((asset) => asset.user_id === member.id);
    const managerAssets = assets.filter((asset) => asset.manager_id === member.id);
    const latestAsset = [...userAssets].sort((a, b) =>
      b.created_at.localeCompare(a.created_at),
    )[0];

    return {
      id: member.id,
      full_name: member.full_name,
      member_role: member.member_role,
      team_name: getTeamName(member.teams),
      user_asset_count: userAssets.length,
      manager_asset_count: managerAssets.length,
      latest_asset_name: latestAsset?.name ?? null,
      latest_registered_at: latestAsset?.created_at ?? null,
    };
  });
}

function getTeamName(team: MemberRecord["teams"]) {
  if (!team) return null;
  if (Array.isArray(team)) return team[0]?.name ?? null;
  return team.name;
}
