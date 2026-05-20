# Asset Register Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the user app `기타 > 물품관리대장` feature for company-owned asset tracking with required primary image upload.

**Architecture:** Add work-schema asset tables plus a private Supabase Storage bucket, expose user-app API routes that enforce auth and asset responsibility, then build a dense table-first page with create/edit dialogs and image preview. Reuse existing user app patterns from projects, requests, `@repo/ui`, and `apps/user/lib/storage.ts`.

**Tech Stack:** Next.js App Router, React client components, Supabase Postgres, Supabase Storage signed URLs, TypeScript, Tailwind, existing `@repo/ui` dialogs/popovers/sonner.

---

## File Structure

- Create `supabase/migrations/20260520000000_asset_register.sql`
  - Owns work-schema tables, constraints, indexes, and `asset-images` bucket creation.
- Modify `apps/user/lib/storage.ts`
  - Adds image-only validation and asset image upload/signed-url/delete helpers.
- Create `apps/user/lib/assets.ts`
  - Owns asset types, status guards, permission helpers, list/detail helpers, signed URL hydration, and validation helpers shared by API routes.
- Create `apps/user/app/api/assets/route.ts`
  - Owns list and create.
- Create `apps/user/app/api/assets/[id]/route.ts`
  - Owns update.
- Create `apps/user/app/api/assets/[id]/images/route.ts`
  - Owns additional image upload and primary replacement.
- Create `apps/user/app/api/assets/[id]/images/[imageId]/route.ts`
  - Owns image deletion.
- Create `apps/user/app/(content)/assets/page.tsx`
  - Server page that loads assets and renders the client surface.
- Create `apps/user/components/assets/AssetRegisterClient.tsx`
  - Owns search/filter state, responsive list/table, dialogs, image preview, and mutation calls.
- Modify `apps/user/components/Sidebar.tsx`
  - Adds `물품관리대장` under `기타`.

---

## Task 1: Database And Storage Migration

**Files:**
- Create: `supabase/migrations/20260520000000_asset_register.sql`

- [ ] **Step 1: Add the migration**

Create `supabase/migrations/20260520000000_asset_register.sql` with:

```sql
create table if not exists work.assets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  status text not null,
  purchase_date date not null,
  purchase_amount integer not null check (purchase_amount >= 0),
  user_id uuid not null,
  user_name text not null,
  manager_id uuid not null,
  manager_name text not null,
  asset_number text,
  serial_number text,
  location text,
  memo text,
  created_by uuid not null,
  created_by_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assets_status_check check (status in ('사용중', '보관중', '수리중', '폐기'))
);

create index if not exists assets_status_idx on work.assets(status);
create index if not exists assets_user_id_idx on work.assets(user_id);
create index if not exists assets_manager_id_idx on work.assets(manager_id);
create index if not exists assets_created_at_idx on work.assets(created_at desc);
create index if not exists assets_search_idx
  on work.assets using gin (
    to_tsvector(
      'simple',
      coalesce(name, '') || ' ' ||
      coalesce(asset_number, '') || ' ' ||
      coalesce(serial_number, '')
    )
  );

create table if not exists work.asset_images (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references work.assets(id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  content_type text,
  size_bytes integer not null check (size_bytes >= 0),
  is_primary boolean not null default false,
  uploaded_by uuid not null,
  uploaded_by_name text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists asset_images_one_primary_idx
  on work.asset_images(asset_id)
  where is_primary = true;

create index if not exists asset_images_asset_id_idx on work.asset_images(asset_id);

insert into storage.buckets (id, name, public)
values ('asset-images', 'asset-images', false)
on conflict (id) do nothing;
```

- [ ] **Step 2: Apply migration locally**

Run:

```bash
pnpm supabase migration up
```

Expected:

```text
Finished supabase migration up.
```

If this repo does not expose `pnpm supabase migration up`, run the established local reset flow:

```bash
npm run db:reset
```

Expected: local Supabase schema includes `work.assets`, `work.asset_images`, and bucket `asset-images`.

- [ ] **Step 3: Verify schema**

Run:

```bash
docker exec supabase_db_meal-v3 psql -U postgres -d postgres -c "\dt work.assets" -c "\dt work.asset_images" -c "select id, public from storage.buckets where id = 'asset-images';"
```

Expected:

```text
work.assets
work.asset_images
asset-images | f
```

- [ ] **Step 4: Commit migration**

Run:

```bash
git add supabase/migrations/20260520000000_asset_register.sql
git commit -m "feat(user): add asset register schema"
```

---

## Task 2: Asset Storage Helpers

**Files:**
- Modify: `apps/user/lib/storage.ts`

- [ ] **Step 1: Extend storage helpers**

In `apps/user/lib/storage.ts`, add `ASSET_BUCKET`, image validation, and helper functions. Keep existing request/project helpers unchanged.

```ts
const ASSET_BUCKET = "asset-images";
const IMAGE_CONTENT_TYPE_PREFIX = "image/";
```

Add below `validateAttachment`:

```ts
export function validateImageAttachment(file: File): string | null {
  const sizeError = validateAttachment(file);
  if (sizeError) return sizeError;
  if (!file.type.startsWith(IMAGE_CONTENT_TYPE_PREFIX)) {
    return "이미지 파일만 업로드할 수 있습니다.";
  }
  return null;
}
```

Add below project helper functions:

```ts
export async function uploadAssetImage(
  assetId: string,
  fileBuffer: Buffer,
  fileName: string,
  contentType: string,
): Promise<UploadResult> {
  return uploadToBucket(ASSET_BUCKET, assetId, fileBuffer, fileName, contentType);
}

export async function getAssetImageSignedUrl(path: string): Promise<string | null> {
  return getSignedUrlForBucket(ASSET_BUCKET, path);
}

export async function deleteAssetImage(path: string): Promise<boolean> {
  return deleteFromBucket(ASSET_BUCKET, path);
}
```

- [ ] **Step 2: Run targeted type check**

Run:

```bash
pnpm --filter user check-types
```

Expected: the command may still fail on existing unrelated files. Confirm there are no new errors mentioning `lib/storage.ts`.

- [ ] **Step 3: Commit storage helpers**

Run:

```bash
git add apps/user/lib/storage.ts
git commit -m "feat(user): add asset image storage helpers"
```

---

## Task 3: Asset Domain Library

**Files:**
- Create: `apps/user/lib/assets.ts`

- [ ] **Step 1: Create asset types and helpers**

Create `apps/user/lib/assets.ts`:

```ts
import type { SessionUser } from "@/lib/auth";
import { createWorkClient } from "@/lib/supabase/client-work";
import { getAssetImageSignedUrl } from "@/lib/storage";

export const ASSET_STATUSES = ["사용중", "보관중", "수리중", "폐기"] as const;
export type AssetStatus = (typeof ASSET_STATUSES)[number];

export type AssetImageRecord = {
  id: string;
  asset_id: string;
  storage_path: string;
  file_name: string;
  content_type: string | null;
  size_bytes: number;
  is_primary: boolean;
  uploaded_by: string;
  uploaded_by_name: string;
  created_at: string;
  signed_url?: string | null;
};

export type AssetRecord = {
  id: string;
  name: string;
  category: string;
  status: AssetStatus;
  purchase_date: string;
  purchase_amount: number;
  user_id: string;
  user_name: string;
  manager_id: string;
  manager_name: string;
  asset_number: string | null;
  serial_number: string | null;
  location: string | null;
  memo: string | null;
  created_by: string;
  created_by_name: string;
  created_at: string;
  updated_at: string;
};

export type AssetSummary = AssetRecord & {
  images: AssetImageRecord[];
  primary_image: AssetImageRecord | null;
  can_edit: boolean;
};

export type AssetPayload = {
  name: string;
  category: string;
  status: AssetStatus;
  purchaseDate: string;
  purchaseAmount: number;
  userId: string;
  userName: string;
  managerId: string;
  managerName: string;
  assetNumber: string | null;
  serialNumber: string | null;
  location: string | null;
  memo: string | null;
};

export function isAssetStatus(value: unknown): value is AssetStatus {
  return typeof value === "string" && ASSET_STATUSES.includes(value as AssetStatus);
}

export function canUpdateAsset(user: SessionUser, asset: Pick<AssetRecord, "user_id" | "manager_id">) {
  return asset.user_id === user.id || asset.manager_id === user.id;
}

export function parseAssetPayload(source: FormData | Record<string, unknown>): AssetPayload {
  const getValue = (key: string) =>
    source instanceof FormData ? source.get(key) : source[key];
  const getString = (key: string) => {
    const value = getValue(key);
    return typeof value === "string" ? value.trim() : "";
  };
  const getOptionalString = (key: string) => {
    const value = getString(key);
    return value.length > 0 ? value : null;
  };

  const name = getString("name");
  const category = getString("category");
  const statusValue = getString("status");
  const purchaseDate = getString("purchaseDate");
  const purchaseAmountValue = getString("purchaseAmount");
  const userId = getString("userId");
  const userName = getString("userName");
  const managerId = getString("managerId");
  const managerName = getString("managerName");
  const purchaseAmount = Number(purchaseAmountValue);

  if (!name) throw new Error("물품명은 필수입니다.");
  if (!category) throw new Error("카테고리는 필수입니다.");
  if (!isAssetStatus(statusValue)) throw new Error("유효한 상태를 선택해주세요.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(purchaseDate)) throw new Error("구매일은 필수입니다.");
  if (!Number.isFinite(purchaseAmount) || purchaseAmount < 0) {
    throw new Error("구매금액은 0원 이상이어야 합니다.");
  }
  if (!userId || !userName) throw new Error("실사용자는 필수입니다.");
  if (!managerId || !managerName) throw new Error("관리 담당자는 필수입니다.");

  return {
    name,
    category,
    status: statusValue,
    purchaseDate,
    purchaseAmount,
    userId,
    userName,
    managerId,
    managerName,
    assetNumber: getOptionalString("assetNumber"),
    serialNumber: getOptionalString("serialNumber"),
    location: getOptionalString("location"),
    memo: getOptionalString("memo"),
  };
}

export async function getAssetById(id: string): Promise<AssetRecord | null> {
  const supabase = createWorkClient();
  const { data, error } = await supabase.from("assets").select("*").eq("id", id).single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data as AssetRecord;
}

export async function listAssetsForUser(user: SessionUser): Promise<AssetSummary[]> {
  const supabase = createWorkClient();
  const { data: assets, error } = await supabase
    .from("assets")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;

  const rows = (assets ?? []) as AssetRecord[];
  if (rows.length === 0) return [];

  const { data: images, error: imageError } = await supabase
    .from("asset_images")
    .select("*")
    .in("asset_id", rows.map((asset) => asset.id))
    .order("created_at", { ascending: true });
  if (imageError) throw imageError;

  const hydratedImages = await Promise.all(
    ((images ?? []) as AssetImageRecord[]).map(async (image) => ({
      ...image,
      signed_url: await getAssetImageSignedUrl(image.storage_path),
    })),
  );

  const imagesByAsset = new Map<string, AssetImageRecord[]>();
  hydratedImages.forEach((image) => {
    const list = imagesByAsset.get(image.asset_id) ?? [];
    list.push(image);
    imagesByAsset.set(image.asset_id, list);
  });

  return rows.map((asset) => {
    const assetImages = imagesByAsset.get(asset.id) ?? [];
    return {
      ...asset,
      images: assetImages,
      primary_image: assetImages.find((image) => image.is_primary) ?? null,
      can_edit: canUpdateAsset(user, asset),
    };
  });
}
```

- [ ] **Step 2: Run targeted type check**

Run:

```bash
pnpm --filter user check-types
```

Expected: the command may fail on known unrelated type errors. Confirm no errors mention `lib/assets.ts`.

- [ ] **Step 3: Commit domain library**

Run:

```bash
git add apps/user/lib/assets.ts
git commit -m "feat(user): add asset domain helpers"
```

---

## Task 4: Asset API Routes

**Files:**
- Create: `apps/user/app/api/assets/route.ts`
- Create: `apps/user/app/api/assets/[id]/route.ts`
- Create: `apps/user/app/api/assets/[id]/images/route.ts`
- Create: `apps/user/app/api/assets/[id]/images/[imageId]/route.ts`

- [ ] **Step 1: Implement list and create route**

Create `apps/user/app/api/assets/route.ts`:

```ts
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createWorkClient } from "@/lib/supabase/client-work";
import { listAssetsForUser, parseAssetPayload } from "@/lib/assets";
import { deleteAssetImage, uploadAssetImage, validateImageAttachment } from "@/lib/storage";

export async function GET() {
  try {
    const session = await requireAuth();
    const assets = await listAssetsForUser(session);
    return NextResponse.json(assets);
  } catch (error) {
    console.error("GET /api/assets error:", error);
    return NextResponse.json({ error: "물품 목록을 불러오지 못했습니다." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let createdAssetId: string | null = null;
  let uploadedPath: string | null = null;

  try {
    const session = await requireAuth();
    const formData = await request.formData();
    const payload = parseAssetPayload(formData);
    const primaryImage = formData.get("primaryImage");

    if (!(primaryImage instanceof File)) {
      return NextResponse.json({ error: "대표 이미지는 필수입니다." }, { status: 400 });
    }

    const validationError = validateImageAttachment(primaryImage);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const supabase = createWorkClient();
    const { data: asset, error: assetError } = await supabase
      .from("assets")
      .insert({
        name: payload.name,
        category: payload.category,
        status: payload.status,
        purchase_date: payload.purchaseDate,
        purchase_amount: payload.purchaseAmount,
        user_id: payload.userId,
        user_name: payload.userName,
        manager_id: payload.managerId,
        manager_name: payload.managerName,
        asset_number: payload.assetNumber,
        serial_number: payload.serialNumber,
        location: payload.location,
        memo: payload.memo,
        created_by: session.id,
        created_by_name: session.fullName,
      })
      .select()
      .single();

    if (assetError) throw assetError;
    createdAssetId = asset.id;

    const fileBuffer = Buffer.from(await primaryImage.arrayBuffer());
    const { path, error: uploadError } = await uploadAssetImage(
      asset.id,
      fileBuffer,
      primaryImage.name,
      primaryImage.type || "application/octet-stream",
    );
    if (uploadError) {
      throw new Error(uploadError);
    }
    uploadedPath = path;

    const { error: imageError } = await supabase.from("asset_images").insert({
      asset_id: asset.id,
      storage_path: path,
      file_name: primaryImage.name,
      content_type: primaryImage.type || null,
      size_bytes: primaryImage.size,
      is_primary: true,
      uploaded_by: session.id,
      uploaded_by_name: session.fullName,
    });
    if (imageError) throw imageError;

    return NextResponse.json(asset, { status: 201 });
  } catch (error) {
    const supabase = createWorkClient();
    if (uploadedPath) await deleteAssetImage(uploadedPath);
    if (createdAssetId) await supabase.from("assets").delete().eq("id", createdAssetId);

    console.error("POST /api/assets error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "물품을 등록하지 못했습니다." },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 2: Implement update route**

Create `apps/user/app/api/assets/[id]/route.ts`:

```ts
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createWorkClient } from "@/lib/supabase/client-work";
import { canUpdateAsset, getAssetById, parseAssetPayload } from "@/lib/assets";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await requireAuth();
    const { id } = await context.params;
    const asset = await getAssetById(id);
    if (!asset) {
      return NextResponse.json({ error: "물품을 찾을 수 없습니다." }, { status: 404 });
    }
    if (!canUpdateAsset(session, asset)) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const body = await request.json();
    const payload = parseAssetPayload(body);
    const supabase = createWorkClient();
    const { data, error } = await supabase
      .from("assets")
      .update({
        name: payload.name,
        category: payload.category,
        status: payload.status,
        purchase_date: payload.purchaseDate,
        purchase_amount: payload.purchaseAmount,
        user_id: payload.userId,
        user_name: payload.userName,
        manager_id: payload.managerId,
        manager_name: payload.managerName,
        asset_number: payload.assetNumber,
        serial_number: payload.serialNumber,
        location: payload.location,
        memo: payload.memo,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error("PATCH /api/assets/[id] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "물품을 수정하지 못했습니다." },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 3: Implement image upload route**

Create `apps/user/app/api/assets/[id]/images/route.ts`:

```ts
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createWorkClient } from "@/lib/supabase/client-work";
import { canUpdateAsset, getAssetById } from "@/lib/assets";
import { deleteAssetImage, uploadAssetImage, validateImageAttachment } from "@/lib/storage";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  let uploadedPath: string | null = null;

  try {
    const session = await requireAuth();
    const { id } = await context.params;
    const asset = await getAssetById(id);
    if (!asset) {
      return NextResponse.json({ error: "물품을 찾을 수 없습니다." }, { status: 404 });
    }
    if (!canUpdateAsset(session, asset)) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const makePrimary = formData.get("isPrimary") === "true";
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "이미지는 필수입니다." }, { status: 400 });
    }
    const validationError = validateImageAttachment(file);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const { path, error: uploadError } = await uploadAssetImage(
      id,
      fileBuffer,
      file.name,
      file.type || "application/octet-stream",
    );
    if (uploadError) throw new Error(uploadError);
    uploadedPath = path;

    const supabase = createWorkClient();
    if (makePrimary) {
      await supabase.from("asset_images").update({ is_primary: false }).eq("asset_id", id);
    }

    const { data, error } = await supabase
      .from("asset_images")
      .insert({
        asset_id: id,
        storage_path: path,
        file_name: file.name,
        content_type: file.type || null,
        size_bytes: file.size,
        is_primary: makePrimary,
        uploaded_by: session.id,
        uploaded_by_name: session.fullName,
      })
      .select()
      .single();
    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    if (uploadedPath) await deleteAssetImage(uploadedPath);
    console.error("POST /api/assets/[id]/images error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "이미지를 업로드하지 못했습니다." },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 4: Implement image delete route**

Create `apps/user/app/api/assets/[id]/images/[imageId]/route.ts`:

```ts
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createWorkClient } from "@/lib/supabase/client-work";
import { canUpdateAsset, getAssetById } from "@/lib/assets";
import { deleteAssetImage } from "@/lib/storage";

type RouteContext = {
  params: Promise<{ id: string; imageId: string }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const session = await requireAuth();
    const { id, imageId } = await context.params;
    const asset = await getAssetById(id);
    if (!asset) {
      return NextResponse.json({ error: "물품을 찾을 수 없습니다." }, { status: 404 });
    }
    if (!canUpdateAsset(session, asset)) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const supabase = createWorkClient();
    const { data: images, error: imagesError } = await supabase
      .from("asset_images")
      .select("*")
      .eq("asset_id", id);
    if (imagesError) throw imagesError;

    const target = (images ?? []).find((image) => image.id === imageId);
    if (!target) {
      return NextResponse.json({ error: "이미지를 찾을 수 없습니다." }, { status: 404 });
    }
    if (target.is_primary) {
      return NextResponse.json(
        { error: "대표 이미지는 삭제할 수 없습니다. 먼저 다른 이미지를 대표 이미지로 등록해주세요." },
        { status: 400 },
      );
    }

    const { error } = await supabase.from("asset_images").delete().eq("id", imageId);
    if (error) throw error;
    await deleteAssetImage(target.storage_path);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/assets/[id]/images/[imageId] error:", error);
    return NextResponse.json({ error: "이미지를 삭제하지 못했습니다." }, { status: 500 });
  }
}
```

- [ ] **Step 5: Run API type check**

Run:

```bash
pnpm --filter user check-types
```

Expected: known unrelated failures may remain, but no errors mention `api/assets` or `lib/assets.ts`.

- [ ] **Step 6: Commit API routes**

Run:

```bash
git add apps/user/app/api/assets apps/user/lib/assets.ts
git commit -m "feat(user): add asset register api"
```

---

## Task 5: Asset Register UI

**Files:**
- Create: `apps/user/app/(content)/assets/page.tsx`
- Create: `apps/user/components/assets/AssetRegisterClient.tsx`

- [ ] **Step 1: Create server page**

Create `apps/user/app/(content)/assets/page.tsx`:

```tsx
import { requireAuth } from "@/lib/auth";
import { listAssetsForUser } from "@/lib/assets";
import { AssetRegisterClient } from "@/components/assets/AssetRegisterClient";

export default async function AssetsPage() {
  const session = await requireAuth();
  const assets = await listAssetsForUser(session);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#111111]">물품관리대장</h1>
        </div>
      </div>
      <AssetRegisterClient assets={assets} />
    </div>
  );
}
```

- [ ] **Step 2: Create client component skeleton**

Create `apps/user/components/assets/AssetRegisterClient.tsx` with the following component boundary:

```tsx
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ImageIcon, Pencil, Plus, Search, X } from "lucide-react";
import { toast } from "@repo/ui/src/sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/ui/src/dialog";
import type { AssetStatus, AssetSummary } from "@/lib/assets";

const ASSET_STATUSES: (AssetStatus | "all")[] = ["all", "사용중", "보관중", "수리중", "폐기"];
const inputClass =
  "h-10 w-full rounded-md border border-[#e5e7eb] bg-white px-3 text-sm text-slate-700 outline-none transition-colors focus:border-[#111111]";
const labelClass = "text-xs font-medium text-slate-600";

type MasterMember = {
  id: string;
  full_name: string;
  role: string | null;
  member_role: string | null;
  team_id: string | null;
};

type AssetFormState = {
  name: string;
  category: string;
  status: AssetStatus;
  purchaseDate: string;
  purchaseAmount: string;
  userId: string;
  userName: string;
  managerId: string;
  managerName: string;
  assetNumber: string;
  serialNumber: string;
  location: string;
  memo: string;
};

const emptyForm: AssetFormState = {
  name: "",
  category: "",
  status: "사용중",
  purchaseDate: "",
  purchaseAmount: "",
  userId: "",
  userName: "",
  managerId: "",
  managerName: "",
  assetNumber: "",
  serialNumber: "",
  location: "",
  memo: "",
};

export function AssetRegisterClient({ assets }: { assets: AssetSummary[] }) {
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<AssetStatus | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const categories = useMemo(
    () => [...new Set(assets.map((asset) => asset.category))].sort((a, b) => a.localeCompare(b, "ko-KR")),
    [assets],
  );

  const filteredAssets = useMemo(() => {
    const normalized = keyword.trim().toLowerCase();
    return assets.filter((asset) => {
      if (statusFilter !== "all" && asset.status !== statusFilter) return false;
      if (categoryFilter !== "all" && asset.category !== categoryFilter) return false;
      if (!normalized) return true;
      return [
        asset.name,
        asset.asset_number,
        asset.serial_number,
        asset.user_name,
        asset.manager_name,
        asset.location,
      ]
        .filter((value): value is string => Boolean(value))
        .some((value) => value.toLowerCase().includes(normalized));
    });
  }, [assets, categoryFilter, keyword, statusFilter]);

  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <Search size={15} strokeWidth={1.5} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className="h-9 w-full rounded-lg border border-[#e5e7eb] bg-white pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 outline-none transition-colors focus:border-[#111111]" value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="물품명, 자산번호, 시리얼번호 검색" />
          </div>
          <select className="h-9 rounded-lg border border-[#e5e7eb] bg-white px-3 text-sm text-slate-600 outline-none focus:border-[#111111]" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as AssetStatus | "all")}>
            {ASSET_STATUSES.map((status) => <option key={status} value={status}>{status === "all" ? "전체 상태" : status}</option>)}
          </select>
          <select className="h-9 rounded-lg border border-[#e5e7eb] bg-white px-3 text-sm text-slate-600 outline-none focus:border-[#111111]" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
            <option value="all">전체 카테고리</option>
            {categories.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
        </div>
        <AssetFormDialog mode="create" />
      </div>

      <AssetTable assets={filteredAssets} onPreview={setPreviewUrl} />
      <AssetMobileList assets={filteredAssets} onPreview={setPreviewUrl} />
      <ImagePreviewDialog url={previewUrl} onClose={() => setPreviewUrl(null)} />
    </section>
  );
}
```

- [ ] **Step 3: Add table, mobile list, form dialog, preview dialog**

Append focused child components to `AssetRegisterClient.tsx`. Keep the component in one file for the first release, but split functions by responsibility:

```tsx
function AssetTable({ assets, onPreview }: { assets: AssetSummary[]; onPreview: (url: string) => void }) {
  if (assets.length === 0) return <EmptyState />;
  return (
    <div className="hidden overflow-hidden rounded-xl border border-[#f3f3f3] bg-white md:block">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1120px] table-fixed text-left">
          <colgroup>
            <col className="w-[88px]" />
            <col className="w-[18%]" />
            <col className="w-[10%]" />
            <col className="w-[80px]" />
            <col className="w-[10%]" />
            <col className="w-[10%]" />
            <col className="w-[104px]" />
            <col className="w-[120px]" />
            <col className="w-[12%]" />
            <col className="w-[88px]" />
          </colgroup>
          <thead className="border-b border-[#f3f3f3] bg-[#fafafa]">
            <tr className="text-[11px] font-medium uppercase tracking-widest text-slate-400">
              <th className="px-4 py-2.5">이미지</th>
              <th className="px-4 py-2.5">물품명</th>
              <th className="px-4 py-2.5">카테고리</th>
              <th className="px-4 py-2.5">상태</th>
              <th className="px-4 py-2.5">실사용자</th>
              <th className="px-4 py-2.5">관리 담당자</th>
              <th className="px-4 py-2.5">구매일</th>
              <th className="px-4 py-2.5">구매금액</th>
              <th className="px-4 py-2.5">위치</th>
              <th className="px-4 py-2.5">작업</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f3f3f3]">
            {assets.map((asset) => (
              <tr key={asset.id} className="transition-colors hover:bg-[#fafafa]">
                <td className="px-4 py-3">
                  <AssetThumbnail asset={asset} onPreview={onPreview} />
                </td>
                <td className="px-4 py-3">
                  <p className="truncate text-sm font-medium text-[#111111]">{asset.name}</p>
                  <p className="truncate text-xs text-slate-400">{asset.asset_number || asset.serial_number || "-"}</p>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">{asset.category}</td>
                <td className="px-4 py-3"><AssetStatusBadge status={asset.status} /></td>
                <td className="px-4 py-3 text-xs text-slate-500">{asset.user_name}</td>
                <td className="px-4 py-3 text-xs text-slate-500">{asset.manager_name}</td>
                <td className="px-4 py-3 text-xs text-slate-500">{asset.purchase_date}</td>
                <td className="px-4 py-3 text-xs text-slate-500">{asset.purchase_amount.toLocaleString("ko-KR")}원</td>
                <td className="px-4 py-3 text-xs text-slate-500">{asset.location || "-"}</td>
                <td className="px-4 py-3">{asset.can_edit ? <AssetFormDialog mode="edit" asset={asset} /> : <span className="text-xs text-slate-300">조회</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

Implement `AssetMobileList`, `AssetFormDialog`, `AssetThumbnail`, `AssetStatusBadge`, `ImagePreviewDialog`, `EmptyState`, and helper functions in the same file. `AssetFormDialog` must:

```ts
const formData = new FormData();
formData.set("name", form.name);
formData.set("category", form.category);
formData.set("status", form.status);
formData.set("purchaseDate", form.purchaseDate);
formData.set("purchaseAmount", form.purchaseAmount);
formData.set("userId", form.userId);
formData.set("userName", form.userName);
formData.set("managerId", form.managerId);
formData.set("managerName", form.managerName);
formData.set("assetNumber", form.assetNumber);
formData.set("serialNumber", form.serialNumber);
formData.set("location", form.location);
formData.set("memo", form.memo);
if (primaryImage) formData.set("primaryImage", primaryImage);
```

Create mode submits:

```ts
await fetch("/api/assets", { method: "POST", body: formData });
```

Edit mode submits JSON metadata first:

```ts
await fetch(`/api/assets/${asset.id}`, {
  method: "PATCH",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(form),
});
```

If edit mode has a replacement primary image, upload it after successful metadata update:

```ts
const imageData = new FormData();
imageData.set("file", primaryImage);
imageData.set("isPrimary", "true");
await fetch(`/api/assets/${asset.id}/images`, { method: "POST", body: imageData });
```

- [ ] **Step 4: Load members in the form dialog**

Inside `AssetFormDialog`, load `/api/masters` when opened:

```ts
useEffect(() => {
  if (!open) return;
  fetch("/api/masters")
    .then((response) => response.json())
    .then((payload) => setMembers(payload.members ?? []))
    .catch(() => setMembers([]));
}, [open]);
```

Use member `<select>` controls for `실사용자` and `관리 담당자`. On change, set both id and name from the selected member.

- [ ] **Step 5: Verify UI build**

Run:

```bash
pnpm --filter user build
```

Expected:

```text
✓ Generating static pages
```

Existing warnings about `@emotion/is-prop-valid` may remain. After the build, revert generated service worker churn:

```bash
git checkout -- apps/user/public/sw.js
```

- [ ] **Step 6: Commit UI page**

Run:

```bash
git add 'apps/user/app/(content)/assets/page.tsx' apps/user/components/assets/AssetRegisterClient.tsx
git commit -m "feat(user): add asset register page"
```

---

## Task 6: Sidebar Menu Integration

**Files:**
- Modify: `apps/user/components/Sidebar.tsx`

- [ ] **Step 1: Add menu icon import**

In `apps/user/components/Sidebar.tsx`, add `PackageSearch` or `Archive` from `lucide-react` to the existing icon import.

```ts
import {
  // existing icons
  PackageSearch,
} from "lucide-react";
```

- [ ] **Step 2: Add menu item under 기타**

In the `기타` group items, insert after `회의실 예약`:

```ts
{ id: "assets", label: "물품관리대장", href: "/assets", icon: PackageSearch },
```

- [ ] **Step 3: Build verify**

Run:

```bash
pnpm --filter user build
```

Expected: build completes. Existing `@emotion/is-prop-valid` warning may remain.

After build:

```bash
git checkout -- apps/user/public/sw.js
```

- [ ] **Step 4: Commit menu integration**

Run:

```bash
git add apps/user/components/Sidebar.tsx
git commit -m "feat(user): add asset register menu"
```

---

## Task 7: End-To-End Manual Verification

**Files:**
- Verify only; no planned source edits unless failures are found.

- [ ] **Step 1: Start user app dev server**

Run:

```bash
pnpm --filter user dev
```

Expected:

```text
Local: http://localhost:3000
```

- [ ] **Step 2: Open `/assets`**

In a browser logged into the user app, navigate to:

```text
http://localhost:3000/assets
```

Expected:

- Page title is `물품관리대장`.
- Table or empty state renders.
- Sidebar has `기타 > 물품관리대장`.

- [ ] **Step 3: Verify create validation**

Open `물품 등록` and submit without selecting a primary image.

Expected:

```text
대표 이미지는 필수입니다.
```

- [ ] **Step 4: Verify successful create**

Fill:

```text
물품명: 테스트 노트북
카테고리: 노트북
구매일: 2026-05-20
구매금액: 1000000
실사용자: 현재 로그인 사용자
관리 담당자: 현재 로그인 사용자
상태: 사용중
대표 이미지: any local png/jpg under 20MB
```

Expected:

- Dialog closes.
- List refreshes.
- New row appears with thumbnail.
- Thumbnail opens image preview.

- [ ] **Step 5: Verify edit permission**

For the row where current user is 실사용자 or 관리 담당자:

Expected:

- `수정` action is visible.
- Metadata update succeeds.
- Primary image replacement succeeds.

For a row where current user is neither:

Expected:

- UI shows `조회` instead of `수정`.
- Direct `PATCH /api/assets/[id]` returns 403.

- [ ] **Step 6: Final commands**

Run:

```bash
git diff --check
pnpm --filter user build
```

Expected:

- `git diff --check` prints nothing.
- build completes.
- Known `@emotion/is-prop-valid` warning may remain.

After build:

```bash
git checkout -- apps/user/public/sw.js
```

- [ ] **Step 7: Final commit if fixes were made**

If verification required source fixes, commit them:

```bash
git add apps/user supabase/migrations/20260520000000_asset_register.sql
git commit -m "fix(user): stabilize asset register flow"
```

---

## Self-Review

Spec coverage:

- Menu under `기타`: Task 6.
- Independent ledger page: Task 5.
- Full list visible to logged-in users: Task 3 and Task 4.
- Create with required primary image: Task 1, Task 2, Task 4, Task 5.
- Edit only for 실사용자 or 관리 담당자: Task 3, Task 4, Task 5.
- Status values `사용중`, `보관중`, `수리중`, `폐기`: Task 1 and Task 3.
- Supabase Storage bucket and signed URLs: Task 1, Task 2, Task 3.
- No delete workflow for assets: Task 4 only deletes images, not assets.
- Verification commands and known typecheck constraints: Task 2, Task 3, Task 4, Task 5, Task 7.

Placeholder scan:

- No `TBD`, `TODO`, or unresolved placeholders remain.

Type consistency:

- `AssetStatus`, `AssetRecord`, `AssetImageRecord`, `AssetSummary`, and `AssetPayload` are introduced in Task 3 and used consistently in later tasks.
- API field names use camelCase form/API input and snake_case database columns.
