# User App Asset Register Design

## Goal

Add a `기타 > 물품관리대장` menu to the user app for managing company-owned assets. The first release focuses on a practical asset ledger: employees can view all registered assets, register assets with required images, and edit only assets they are responsible for.

## Scope

The feature is an independent user-app screen, not tied to projects or requests in the first release.

Included:

- Add a `물품관리대장` menu under the existing `기타` sidebar group.
- Add a ledger page for company-owned assets.
- Allow all logged-in employees to view the full asset list.
- Allow logged-in employees to create assets.
- Allow edits only when the current user is the asset's `실사용자` or `관리 담당자`.
- Require one primary image when creating an asset.
- Allow optional additional images.
- Manage asset status as `사용중`, `보관중`, `수리중`, or `폐기`.
- Use Supabase Storage for image files.

Excluded from the first release:

- Asset deletion.
- Approval workflows.
- Project/request linkage.
- Depreciation, accounting, or finance workflows.
- Check-in/check-out rental history.

## Required Asset Fields

Asset creation requires:

- 물품명
- 카테고리
- 구매일
- 구매금액
- 실사용자
- 관리 담당자
- 상태
- 대표 이미지

Optional fields:

- 자산번호
- 시리얼번호
- 보관 위치
- 메모
- 추가 이미지

## UX Design

The page uses a dense internal-tool layout consistent with the existing user app project and request screens.

Top area:

- Title: `물품관리대장`
- Primary action: `물품 등록`
- Search input for 물품명, 자산번호, and 시리얼번호.
- Filters for 카테고리, 상태, 실사용자, and 관리 담당자.

Desktop list:

- Table-first layout.
- Columns: 이미지, 물품명, 카테고리, 상태, 실사용자, 관리 담당자, 구매일, 구매금액, 위치, 작업.
- Thumbnail click opens an image preview dialog.
- Row actions show edit controls only when the current user can edit that asset.

Mobile list:

- Compact card list instead of a squeezed table.
- Each card shows primary image, asset name, status, user, manager, purchase date, and purchase amount.
- Edit action appears only when permitted.

Asset form:

- Used for both create and edit.
- Create mode requires all required fields and one primary image.
- Edit mode allows metadata updates, primary image replacement, and additional image management.
- The form should use existing dialog styling and form density from project/request dialogs.

## Data Model

Add tables in the work schema.

### `assets`

- `id uuid primary key`
- `name text not null`
- `category text not null`
- `status text not null`
- `purchase_date date not null`
- `purchase_amount integer not null`
- `user_id uuid not null`
- `user_name text not null`
- `manager_id uuid not null`
- `manager_name text not null`
- `asset_number text null`
- `serial_number text null`
- `location text null`
- `memo text null`
- `created_by uuid not null`
- `created_by_name text not null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Status values are constrained to `사용중`, `보관중`, `수리중`, and `폐기`.

### `asset_images`

- `id uuid primary key`
- `asset_id uuid not null references assets(id) on delete cascade`
- `storage_path text not null`
- `file_name text not null`
- `content_type text null`
- `size_bytes integer not null`
- `is_primary boolean not null default false`
- `uploaded_by uuid not null`
- `uploaded_by_name text not null`
- `created_at timestamptz not null default now()`

Each asset must have exactly one primary image after creation. The API enforces this rule.

## Storage

Use Supabase Storage bucket `asset-images`.

Path format:

```text
{assetId}/{uuid}.{ext}
```

Rules:

- Accept image files only.
- Maximum file size: 20MB, matching the existing attachment policy.
- Store private files and serve them through signed URLs, matching the existing request/project attachment approach.
- Deleting the last primary image is not allowed.

## API Design

Add asset APIs under the user app.

- `GET /api/assets`
  - Returns all assets with primary image metadata and signed preview URL.
  - Supports query params for search and filters.

- `POST /api/assets`
  - Accepts multipart form data.
  - Requires asset fields and `primaryImage`.
  - Creates asset row first, uploads the image to `asset-images`, then creates an `asset_images` row with `is_primary = true`.
  - Rolls back the asset row if image upload or image row creation fails.

- `PATCH /api/assets/[id]`
  - Allows metadata updates only for the asset's `실사용자` or `관리 담당자`.
  - Does not delete assets.

- `POST /api/assets/[id]/images`
  - Allows permitted users to upload additional images.
  - Can optionally replace the primary image.

- `DELETE /api/assets/[id]/images/[imageId]`
  - Allows permitted users to delete non-primary images.
  - Allows primary image deletion only when another image is promoted in the same operation.
  - Never leaves an asset without a primary image.

## Permissions

Permission rules:

- Read: any logged-in employee.
- Create: any logged-in employee.
- Update metadata: asset `user_id` or `manager_id`.
- Manage images: asset `user_id` or `manager_id`.
- Delete asset: not included in the first release.

The API is the source of truth for permission checks. UI controls should hide disallowed actions but must not be trusted for enforcement.

## Validation And Error Handling

Create validation:

- Missing required text/date/amount/user/status fields returns 400.
- Missing primary image returns 400.
- Non-image files return 400.
- Files over 20MB return 400.
- Invalid status returns 400.

Update validation:

- Unauthorized updates return 403.
- Unknown assets return 404.
- Invalid status or malformed fields return 400.

Operational handling:

- If asset creation succeeds but image upload fails, remove the created asset row before returning an error.
- If image DB insert fails after upload, remove the uploaded storage object before returning an error.
- Log server-side errors with route-specific prefixes.

## Testing And Verification

Implementation should verify:

- Menu appears under `기타`.
- Asset list loads for logged-in users.
- Create fails without a primary image.
- Create succeeds with required fields and one primary image.
- Additional images can be uploaded.
- Users can edit assets where they are the 실사용자 or 관리 담당자.
- Users cannot edit unrelated assets.
- Search and filters update the table results.
- Image preview opens from the thumbnail.
- `pnpm --filter user build` passes.

Current known repository constraint:

- `pnpm --filter user check-types` has existing unrelated failures in user app files outside this feature. Implementation should still avoid introducing new feature-local type errors and record any remaining global typecheck blockers.
