# Branch Cleanup Documentation

## Overview
This document describes the process for removing merged branches from the repository.

## Identified Merged Branches

The following branches have been merged via Pull Requests and can be safely deleted:

| Branch Name | PR # | Merged Date | Status |
|------------|------|-------------|--------|
| `fix/docker-image-name` | #13 | 2026-02-05 | ✓ Merged |
| `feature/update-agents-workflow` | #11 | 2026-02-05 | ✓ Merged |
| `refactor/webhook-complexity` | #10 | 2026-02-05 | ✓ Merged |
| `feature/monorepo-structure` | #9 | 2026-02-05 | ✓ Merged |
| `docs/update-agents-md` | #8 | 2026-02-05 | ✓ Merged |
| `feat/add-docker-deployment` | #6 | 2026-02-04 | ✓ Merged |
| `feature/docker` | #3 | 2026-02-04 | ✓ Merged |
| `feature/hot-reload` | #1 | 2026-02-04 | ✓ Merged |

## Manual Deletion Process

To delete these branches manually, run:

```bash
# Delete each merged branch from remote
git push origin --delete fix/docker-image-name
git push origin --delete feature/update-agents-workflow
git push origin --delete refactor/webhook-complexity
git push origin --delete feature/monorepo-structure
git push origin --delete docs/update-agents-md
git push origin --delete feat/add-docker-deployment
git push origin --delete feature/docker
git push origin --delete feature/hot-reload

# Clean up local references
git fetch --prune
```

## Automated Deletion Script

Run the provided script:

```bash
./scripts/delete-merged-branches.sh
```

This script will:
1. List all merged branches to be deleted
2. Ask for confirmation
3. Delete the branches from remote
4. Prune local references

## GitHub Actions Workflow (Alternative)

Alternatively, trigger the automated cleanup workflow:

```bash
gh workflow run delete-merged-branches.yml
```

## Verification

After deletion, verify that branches are removed:

```bash
# List remaining remote branches
git branch -r

# List only feature branches
git branch -r | grep -E "feature|feat|fix|refactor|docs"
```

## Notes

- Branches are only deleted from remote (GitHub)
- Local branches (if any exist) are not affected
- This operation is safe as all these branches have been merged to main
- Branch protection rules may prevent deletion of certain branches
