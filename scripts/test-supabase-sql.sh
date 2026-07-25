#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
project_id="$(awk -F'"' '/^project_id = / { print $2; exit }' "$repo_root/supabase/config.toml")"
container_name="supabase_db_${project_id}"

if [[ -z "$project_id" ]]; then
  echo "supabase/config.toml에서 project_id를 찾지 못했습니다." >&2
  exit 1
fi

for test_file in "$repo_root"/supabase/tests/*.sql; do
  echo "Running ${test_file#"$repo_root"/}"

  if [[ -n "${LOCAL_DB_URL:-}" ]]; then
    psql "$LOCAL_DB_URL" -v ON_ERROR_STOP=1 -f "$test_file"
  else
    docker exec -i "$container_name" \
      psql -U postgres -d postgres -v ON_ERROR_STOP=1 < "$test_file"
  fi
done
