#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
test_output="$(mktemp -d)"
trap 'rm -rf "$test_output"' EXIT

cd "$repo_root"
pnpm --filter admin exec tsc \
  lib/expense-processing-workbook.ts \
  lib/expense-processing-workbook.test.ts \
  --outDir "$test_output" \
  --module commonjs \
  --moduleResolution node \
  --target ES2022 \
  --esModuleInterop \
  --skipLibCheck
NODE_PATH="$repo_root/apps/admin/node_modules" \
  node "$test_output/expense-processing-workbook.test.js"
