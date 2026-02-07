---
name: create-pr
description: Automates GitHub PR creation workflow. Use when: (1) Creating a pull request for current branch, (2) Need to prepare and push commits before PR, (3) Automating full PR creation from feature development to PR submission
---

# Create PR

## Workflow

### 1. Check Current State

```bash
git status
git branch --show-current
```

### 2. Handle Branch Setup

If no feature branch exists or working on main/master:

```bash
git checkout main
git pull origin main
```

Generate branch name from changes:
- Analyze git diff to identify what was changed
- Create descriptive branch name: `feature/<description>`
- Example: `feature/add-auth-middleware`, `fix-memory-leak`

```bash
git checkout -b feature/<description>
```

### 3. Commit Changes

If uncommitted changes exist:

```bash
git status
git diff
git log --oneline -5
```

Analyze changes and create commit message following AGENTS.md format:
- Format: `type(scope): description`
- Types: feat, fix, refactor, style, docs, test, chore

```bash
git add .
git commit -m "type(scope): description"
```

### 4. Push to Remote

```bash
git push -u origin feature/<branch-name>
```

### 5. Create PR

```bash
git status
git diff main...HEAD
git log main..HEAD --oneline
```

Analyze all commits from branch divergence to create PR summary.

```bash
gh pr create --title "<title>" --body "<body>"
```

PR body format (use heredoc for multi-line):

```bash
gh pr create --title "<title>" --body "$(cat <<'EOF'
## Summary
• <first bullet point>
• <second bullet point>

## Changes
- <key change 1>
- <key change 2>
EOF
)"
```

## Constraints

- **NEVER commit when tests fail** - run tests first: `pnpm --filter hra test`
- **NEVER commit secrets** - check for .env, credentials.json, etc.
- **NEVER push to remote main/master**
- **NEVER force push unless explicitly requested**
- Commit messages must follow AGENTS.md format

## Safety

- Verify no secrets in staged changes before committing
- Confirm branch name is descriptive and follows convention
- Ensure all tests pass before committing
- Review PR summary for accuracy
