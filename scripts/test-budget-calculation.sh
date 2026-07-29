#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
test_output="$(mktemp -d)"
trap 'rm -rf "$test_output"' EXIT

cd "$repo_root"
pnpm --filter admin exec tsc \
  lib/budget-calculation.ts \
  lib/budget-calculation.test.ts \
  --outDir "$test_output" \
  --module commonjs \
  --moduleResolution node \
  --target ES2022 \
  --esModuleInterop \
  --skipLibCheck
node --test "$test_output/budget-calculation.test.js"
