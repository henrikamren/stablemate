#!/bin/bash
# StableMate test fixes installer
# Run from: ~/projects/stablemate/
# Usage: bash fixes/install.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "Installing StableMate test fixes..."
echo "Project root: $PROJECT_DIR"
echo ""

# App fixes
echo "→ Updating js/data.js (globalThis mirrors + appReady flag)"
cp "$SCRIPT_DIR/js/data.js" "$PROJECT_DIR/js/data.js"

echo "→ Updating js/init.js (guarded o-level listener)"
cp "$SCRIPT_DIR/js/init.js" "$PROJECT_DIR/js/init.js"

# Test fixes
REGRESSION_DIR="$PROJECT_DIR/stablemate-regression"

if [ ! -d "$REGRESSION_DIR" ]; then
  echo "ERROR: stablemate-regression/ not found at $REGRESSION_DIR"
  exit 1
fi

echo "→ Updating fixtures/mockData.js (expanded test data)"
cp "$SCRIPT_DIR/fixtures/mockData.js" "$REGRESSION_DIR/fixtures/mockData.js"

echo "→ Updating tests/stablemate.spec.js (fixed counts + tight timeouts)"
cp "$SCRIPT_DIR/tests/stablemate.spec.js" "$REGRESSION_DIR/tests/stablemate.spec.js"

echo "→ Updating tests/stablemate-features.spec.js (66 feature tests + tight timeouts)"
cp "$SCRIPT_DIR/tests/stablemate-features.spec.js" "$REGRESSION_DIR/tests/stablemate-features.spec.js"

echo ""
echo "Done. Run tests with:"
echo "  cd $REGRESSION_DIR && npm test"
