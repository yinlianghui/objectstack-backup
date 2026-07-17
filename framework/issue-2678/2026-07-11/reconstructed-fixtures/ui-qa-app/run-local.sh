#!/bin/sh
set -eu

PACKAGE_ROOT=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd -P)
FRAMEWORK_ROOT=$(pwd -P)

node "$PACKAGE_ROOT/scripts/prepare-local.mjs"
exec node "$PACKAGE_ROOT/scripts/start-ui.mjs" \
  --framework-root "$FRAMEWORK_ROOT" \
  --mode manual \
  --port 38421
