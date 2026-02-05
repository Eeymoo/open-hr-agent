---
name: new-issue
description: Guides the creation of new requirements/issues in the open-hr-agent project following AGENTS.md workflow. Use when: (1) Creating new features or requirements, (2) Starting work on new issues or user stories, (3) Any development task requiring project workflow compliance
---

# New Issue Creation

## Workflow

### Branch Setup

```bash
git checkout main
git pull origin main
git checkout -b feature/your-feature-name
```

### Development

Follow AGENTS.md conventions:
- camelCase, 2-space indent, single quotes
- Import ordering: stdlib → third-party → internal → type imports
- Error handling: Use Result class from packages/hr-agent/src/utils/Result.ts
- Use async/await for async operations
- No console.log in production code

### Testing (CRITICAL)

**All new or modified APIs MUST have test cases:**
- Test files: sourceFileName.test.ts or sourceFileName.spec.ts
- Mock external dependencies (network, filesystem, database)
- Cover edge cases (null, undefined, empty arrays)

```bash
pnpm --filter hra test
```

Tests must pass before proceeding.

### Code Quality

```bash
pnpm run format
pnpm run typecheck
pnpm run lint
pnpm run check
```

### Push

```bash
git push -u origin feature/your-feature-name
```

## Constraints

- **NEVER commit when tests fail**
- Never commit secrets or credentials
- Commit format: `type(scope): description` (feat, fix, refactor, etc.)
- Keep commits small and focused

## Safety

- Never modify git config
- Never force push unless explicitly requested
- Never push to remote main/master without confirmation