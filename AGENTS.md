# AGENTS.md - Open HR Agent Monorepo Guidelines

## Package AGENTS.md

- [packages/hr-agent/AGENTS.md](packages/hr-agent/AGENTS.md) - Backend (Express + Prisma)
- [packages/hr-agent-web/AGENTS.md](packages/hr-agent-web/AGENTS.md) - Frontend (React + Vite)
- [packages/coding-agent/AGENTS.md](packages/coding-agent/AGENTS.md) - Docker container for AI coding

## Project Overview

GitHub-based AI task management monorepo using pnpm workspace.

- **hra** - Backend service (Issue/PR management, task orchestration)
- **ca** - Coding Agent (Docker container for AI coding tasks)
- **hr-agent-web** - React frontend

## Environment

- TypeScript Monorepo (pnpm workspace, ES modules)
- Package Manager: pnpm >= 9.0.0
- Runtime: Node.js >= 22.0.0

## Primary Commands

### Build & Type Check
```bash
pnpm install                    # Install all dependencies
pnpm run build                  # Build all packages
pnpm --filter hra build         # Build specific package
pnpm run typecheck              # Type check all packages
```

### Code Quality
```bash
pnpm run lint                   # Lint all packages
pnpm run format                 # Format all packages
pnpm run check                  # typecheck + lint
```

### Testing
```bash
pnpm --filter hra test                          # Run all tests
pnpm --filter hra test src/routes.test.ts       # Run single test file
pnpm --filter hra test -- --grep "pattern"      # Run tests by pattern
pnpm --filter hra test:coverage                 # Run with coverage
```

### Database (Prisma) - hra package
```bash
pnpm --filter hra prisma:generate   # Generate Prisma client
pnpm --filter hra prisma:migrate    # Run migrations
pnpm --filter hra prisma:push       # Push schema to DB
pnpm --filter hra db:setup          # Full DB setup
```

### Running
```bash
pnpm --filter hra dev           # Backend dev server (nodemon)
pnpm --filter hr-agent-web dev  # Frontend dev server (Vite)
```

## Development Workflow (Strictly Follow)

### Phase 1: Environment Setup & Task Breakdown

1. **Sync Code**: `git fetch origin main && git rebase origin/main`
2. **Task Breakdown**: Create Todo List, **must include "Write/Update test cases"**

### Phase 2: Atomic Development & Testing Loop

1. **Code Standards**: Only modify task-related modules and test files
2. **Test Writing**: Write unit/integration tests for new functions/APIs
3. **Check & Validate**: Run `pnpm run check` after each feature
   - Lint errors: Fix code style
   - Test failures: Fix business logic until all pass
4. **Atomic Commit**: Follow Conventional Commits (`feat(scope): description`)

### Phase 3: PR Creation & CI Monitoring

```bash
git push origin <branch>
gh pr create --draft --title "feat: [task summary]" --body "## Changes\n- [x] Implementation\n- [x] Tests"
gh pr checks <PR_NUMBER> --watch 2>&1 || true
```

### Phase 4: Final Delivery

```bash
gh pr ready <PR_NUMBER>
```

## Code Style & Conventions

### Import Ordering
1. Standard library (`node:*`) 2. Third-party packages 3. Internal modules 4. Type imports

### TypeScript Rules
- Strict mode, target ES2022, no `any` type
- No unused vars/params unless prefixed with `_`
- Prefer optional chaining (`?.`) and nullish coalescing (`??`)

### Naming Conventions
| Type | Convention | Example |
|------|------------|---------|
| Variables/Functions | camelCase | `taskManager` |
| Constants | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |
| Classes/Interfaces | PascalCase | `TaskScheduler` |
| Files | camelCase.ts | `taskScheduler.ts` |
| Routes | name.method.ts | `issues.post.ts` |

### Error Handling
```typescript
res.json(new Result(data, 200, 'Success'));
res.json(new Result().error(404, 'Not found'));
```

### Formatting (Prettier)
- 2 space indent, single quotes, semicolons required
- Trailing commas: never, print width: 100

## Testing Guidelines

- Framework: Vitest (globals enabled, node environment)
- Pattern: `describe`/`it`, Test files: `*.test.ts` or `*.spec.ts`
- Mock external dependencies, test all public APIs

## Important Notes

- **Test First**: Write failing tests first for complex logic
- **Force Rebase**: `git fetch origin main && git rebase origin/main` before each Todo
- **CI Blocking**: No next step if CI fails
