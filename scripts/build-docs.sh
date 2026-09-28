#!/usr/bin/env bash
# Build the VitePress docs site and nest Redocly OpenAPI HTML under /api/.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Building VitePress site"
npx vitepress build docs

DIST="$ROOT/docs/.vitepress/dist"
mkdir -p "$DIST/api"

echo "==> Building Redocly OpenAPI → dist/api/"
npx redocly --config docs/redocly.yaml build-docs pgp@v1 -o "$DIST/api/index.html"

echo "==> Docs build complete: $DIST"
echo "    Hub:  $DIST/index.html"
echo "    API:  $DIST/api/index.html"
