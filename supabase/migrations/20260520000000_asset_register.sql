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

alter table work.assets enable row level security;
alter table work.asset_images enable row level security;

create policy "service_role_all" on work.assets
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create policy "service_role_all" on work.asset_images
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

grant all on work.assets to service_role;
grant all on work.asset_images to service_role;

create or replace function work.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at before update on work.assets
  for each row execute function work.update_updated_at();

insert into storage.buckets (id, name, public)
select 'asset-images', 'asset-images', false
where not exists (
  select 1
  from storage.buckets
  where id = 'asset-images' or name = 'asset-images'
);
