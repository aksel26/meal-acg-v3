#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
test_output="$(mktemp -d)"
trap 'rm -rf "$test_output"' EXIT

cd "$repo_root"
pnpm --filter user exec tsc \
  lib/leave-balance.test.ts \
  lib/chat/answers.test.ts \
  --rootDir . \
  --outDir "$test_output" \
  --module commonjs \
  --moduleResolution node \
  --target ES2022 \
  --esModuleInterop \
  --skipLibCheck
NODE_PATH="$repo_root/apps/user/node_modules" \
  node "$test_output/lib/leave-balance.test.js"
NODE_PATH="$repo_root/apps/user/node_modules" \
  node "$test_output/lib/chat/answers.test.js"
