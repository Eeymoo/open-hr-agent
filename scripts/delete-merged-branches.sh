#!/bin/bash

# Script to delete merged branches from remote
# This script identifies and deletes branches that have been merged via PRs

set -e

echo "🔍 Finding merged branches..."

# List of branches that were merged via PRs (based on GitHub PR data)
MERGED_BRANCHES=(
  "fix/docker-image-name"
  "feature/update-agents-workflow"
  "refactor/webhook-complexity"
  "feature/monorepo-structure"
  "docs/update-agents-md"
  "feat/add-docker-deployment"
  "feature/docker"
  "feature/hot-reload"
)

echo ""
echo "📋 Merged branches to be deleted:"
for branch in "${MERGED_BRANCHES[@]}"; do
  echo "  - $branch"
done

echo ""
read -p "⚠️  Are you sure you want to delete these ${#MERGED_BRANCHES[@]} branches from remote? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo "❌ Deletion cancelled"
  exit 0
fi

echo ""
echo "🗑️  Deleting merged branches from remote..."

for branch in "${MERGED_BRANCHES[@]}"; do
  if git ls-remote --heads origin "$branch" | grep -q "$branch"; then
    echo "  Deleting origin/$branch..."
    git push origin --delete "$branch" || echo "  ⚠️  Failed to delete $branch"
  else
    echo "  ℹ️  Branch $branch not found on remote"
  fi
done

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "🔄 Pruning local references to deleted remote branches..."
git fetch --prune

echo ""
echo "📊 Remaining remote branches:"
git branch -r
