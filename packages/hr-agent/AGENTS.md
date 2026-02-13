# AGENTS.md - HR Agent Package Guidelines

## Package Overview

HR Agent (hra) - Express-based backend service for GitHub Issue/PR management and task orchestration.

## Environment

- Language: TypeScript (ES Modules)
- Runtime: Node.js >= 22.0.0
- Framework: Express 5
- Database: Prisma ORM (PostgreSQL)
- Testing: Vitest

## Primary Commands

### Build & Development
```bash
pnpm build          # Compile TypeScript
pnpm typecheck      # Type check without emit
pnpm dev            # Dev server with nodemon
pnpm start          # Production server
```

### Code Quality
```bash
pnpm lint           # ESLint check
pnpm format         # Prettier format
pnpm check          # typecheck + lint + test:coverage
```

### Testing
```bash
pnpm test                          # Run all tests
pnpm test src/routes.test.ts       # Run single test file
pnpm test -- --grep "pattern"      # Run tests by pattern
pnpm test:coverage                 # Run with coverage
```

### Database (Prisma)
```bash
pnpm prisma:generate   # Generate Prisma client
pnpm prisma:migrate    # Run migrations
pnpm prisma:push       # Push schema to DB
pnpm db:setup          # Full DB setup
```

## Development Workflow

1. **Sync Code**: `git fetch origin main && git rebase origin/main`
2. **Task Breakdown**: Create Todo List, **must include "Write/Update test cases"**
3. **Develop**: Only modify task-related modules and test files
4. **Validate**: Run `pnpm check` - must pass all lint and tests
5. **Commit**: Use Conventional Commits format
6. **PR**: Create Draft PR, monitor CI with `gh pr checks <PR> --watch`

## Code Style & Conventions

### Import Ordering
1. Standard library (`node:*`)
2. Third-party packages
3. Internal modules
4. Type imports

```typescript
import fs from 'node:fs';
import { Request, Response } from 'express';
import Result from './utils/Result.js';
import type { TaskConfig } from './types.js';
```

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
| Private members | _leadingUnderscore | `_privateField` |
| Files | camelCase.ts | `taskScheduler.ts` |
| Routes | name.method.ts | `issues.post.ts` |

### Error Handling
```typescript
res.json(new Result(data, 200, 'Success'));
res.json(new Result().error(404, 'Not found'));
// Response: { code: number, message: string, data: T }
```

### Formatting (Prettier)
- 2 space indent, single quotes, semicolons required
- Trailing commas: never, print width: 100

### Code Complexity
- Max depth: 3, Max params: 4, Max lines per function: 100
- No magic numbers (except -1, 0, 1, 2)

## Testing Guidelines

- Framework: Vitest (globals enabled, node environment)
- Pattern: `describe`/`it`, Test files: `*.test.ts`
- Mock external dependencies, test all public APIs

## File Organization

```
src/
├── index.ts           # Express app entry
├── routes/            # API handlers (auto-loaded)
├── middleware/        # Express middleware
├── services/          # Business logic
├── tasks/             # Task orchestration
├── utils/             # Utilities (Result class)
└── config/            # Configuration
```

## Special Features

### Auto-Load Routes
- HTTP method suffix: `routeName.get.ts`, `routeName.post.ts`
- Dynamic routes: `[id].ts` → `:id` parameter
- Example: `routes/v1/hello.get.ts` → `GET /v1/hello`

### GitHub Webhooks
- Issues: `routes/v1/webhooks/issues.post.ts`
- PRs: `routes/v1/webhooks/pullRequests.post.ts`
- HMAC verification via `crypto.timingSafeEqual`
