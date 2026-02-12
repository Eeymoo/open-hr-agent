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
pnpm --filter hra prisma:studio     # Open Prisma Studio
pnpm --filter hra db:setup          # Full DB setup
```

### Running
```bash
pnpm --filter hra dev           # Backend dev server (nodemon)
pnpm --filter hra start         # Backend prod server
pnpm --filter hr-agent-web dev  # Frontend dev server (Vite)
```

### Scripts (scripts/)
```bash
scripts/start.sh                # Start all Docker containers
scripts/stop.sh                 # Stop all Docker containers
scripts/test/test-ca-api.sh     # Test CA container API
scripts/test/test-task-manager.sh  # Test task manager workflow
```

## Development Workflow

1. Create feature branch from main
2. Develop feature
3. **Write tests for all new/modified APIs**
4. Run tests: `pnpm --filter hra test` (must pass)
5. Format: `pnpm run format`
6. Type check: `pnpm run typecheck`
7. Commit and push

## Code Style & Conventions

### Import Ordering
1. Standard library (`node:*`)
2. Third-party packages
3. Internal modules (`@/` or relative)
4. Type imports (group separately)

```typescript
import fs from 'node:fs';
import { Request, Response } from 'express';
import { Octokit } from 'octokit';
import Result from './utils/Result.js';
import type { TaskConfig } from './types.js';
```

### TypeScript Rules
- Strict mode enabled, target ES2022
- Explicit return types preferred (warn)
- No `any` type - use `unknown`
- No unused vars/params unless prefixed with `_`
- Implicit returns: error
- Prefer optional chaining (`?.`) and nullish coalescing (`??`)
- Non-null assertions discouraged (warn)

### Naming Conventions
| Type | Convention | Example |
|------|------------|---------|
| Variables/Functions | camelCase | `taskManager` |
| Constants | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |
| Classes/Interfaces | PascalCase | `TaskScheduler` |
| Private members | _leadingUnderscore | `_privateField` |
| Files | camelCase.ts | `taskScheduler.ts` |
| Routes | name.method.ts | `issues.post.ts` |

### Error Handling
Use `Result` class from `packages/hr-agent/src/utils/Result.ts`:

```typescript
// Success response
res.json(new Result(data, 200, 'Operation successful'));

// Error response
res.json(new Result().error(404, 'Resource not found'));

// Chaining
new Result().success(data, 'Created').toJSON();
```

Response structure: `{ code: number, message: string, data: T }`

### Formatting (Prettier)
- 2 space indent, single quotes (double for escape)
- Semicolons required, trailing commas: never
- Arrow parens: always, print width: 100
- End of line: lf

### Code Complexity
- Max depth: 3
- Max params: 4 (warn)
- Max lines per function: 100 (warn)
- Complexity: C10 (warn)
- No magic numbers (except -1, 0, 1, 2)

### Best Practices
- Prefer `const` over `let`
- Use template literals
- Object shorthand: `{ x }` over `{ x: x }`
- Destructuring preferred
- `async/await` over raw promises
- No `console/debugger` in production

## Testing Guidelines

- Framework: Vitest (node environment, globals enabled)
- Pattern: `describe`/`it`
- Test files: `*.test.ts` or `*.spec.ts`
- Mock external dependencies
- All public APIs, utilities, error scenarios must be tested

## Special Features

### Auto-Load Routes (hra)
- Middleware: `src/middleware/autoLoadRoutes.ts`
- HTTP method suffix: `routeName.get.ts`, `routeName.post.ts`
- Dynamic routes: `[id].ts` → `:id` parameter
- Example: `routes/v1/hello.get.ts` → `GET /v1/hello`

### GitHub Webhooks
- Issues: `routes/v1/webhooks/issues.post.ts`
- PRs: `routes/v1/webhooks/pullRequests.post.ts`
- HMAC verification via `crypto.timingSafeEqual`

## File Organization

```
open-hr-agent2/
├── packages/
│   ├── hr-agent/           # Backend (Express + Prisma)
│   ├── coding-agent/       # Docker container for AI coding
│   └── hr-agent-web/       # Frontend (React + Vite)
├── scripts/
│   ├── start.sh            # Start all containers
│   ├── stop.sh             # Stop all containers
│   └── test/               # Test scripts
├── docker-compose.yml      # Docker orchestration
└── AGENTS.md               # This file
```

## Commit & Safety

- Format: `type(scope): description` (feat, fix, refactor, style, docs, test, chore)
- Run format, lint, tests before commit
- Never commit secrets
- Never modify git config
- Never force push without request
- Never push to main/master without confirmation
