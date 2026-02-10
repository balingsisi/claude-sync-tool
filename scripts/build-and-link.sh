#!/bin/bash
# Convenience script to build and link claude-sync for development

set -e

echo "Building claude-sync..."
npm run build

echo "Linking globally..."
npm link

echo "✓ Done! You can now run 'claude-sync' from anywhere."
echo "  Try: claude-sync --help"
