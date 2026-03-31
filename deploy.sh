#!/bin/bash
# StableMate deploy script
# Usage: ./deploy.sh /path/to/new/index.html

SRC="${1:-$HOME/Downloads/index.html}"
DEST="$HOME/projects/stablemate/index.html"

echo "Copying $SRC → $DEST"
cp "$SRC" "$DEST"

echo "Cleaning up Downloads..."
rm -f "$HOME/Downloads/index.html"

cd "$HOME/projects/stablemate"
echo "Deploying to Vercel..."
git add index.html
git commit -m "update index.html"
git push

echo "Done!"
