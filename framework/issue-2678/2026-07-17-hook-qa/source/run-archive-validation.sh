#!/bin/bash

set -euo pipefail

root=$(cd "$(dirname "$0")/.." && pwd -P)
node "$root/source/build-manifest.mjs" "$root" >/dev/null
node "$root/source/build-sha256-manifest.mjs" \
  --root "$root" \
  --output "$root/SHA256SUMS" >/dev/null
node "$root/source/verify-archive.mjs" "$root"
