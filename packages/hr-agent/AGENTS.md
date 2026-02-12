# AGENTS.md - HR Agent Package Guidelines

## Package Overview

HR Agent (hra) - Express-based backend service for GitHub Issue/PR management and task orchestration. Handles webhooks, task scheduling, and CA coordination.

## Environment

- Language: TypeScript (ES Modules)
- Runtime: Node.js >= 22.0.0
- Package Manager: pnpm >= 9.0.0
- Framework: Express 5
- Database: Prisma ORM (PostgreSQL)
- Testing: Vitest

## Primary Commands

### Build & Type Check
```bash
pnpm --filter hra build        # Compile TypeScript
pnpm --filter hra typecheck    # Type check without emit
pnpm --filter hra dev          # Dev server with nodemon
pnpm --filter hra start        # Production server
```

### Code Quality
```bash
pnpm --filter hra lint         # ESLint check
pnpm --filter hra format       # Prettier format
pnpm --filter hra check        # typecheck + lint
```

### Testing
```bash
pnpm --filter hra test                          # Run all tests
pnpm --filter hra test src/routes.test.ts       # Run single file
pnpm --filter hra test -- --grep "pattern"      # Run by pattern
pnpm --filter hra test:coverage                 # Run with coverage
pnpm --filter hra test:ui                       # Vitest UI mode
```

### Database (Prisma)
```bash
pnpm --filter hra prisma:generate   # Generate Prisma client
pnpm --filter hra prisma:migrate    # Run migrations
pnpm --filter hra prisma:push       # Push schema to DB
pnpm --filter hra prisma:studio     # Open Prisma Studio
pnpm --filter hra db:setup          # Full DB setup
```

## Development Workflow

1. Create feature branch from main
2. Develop feature
3. **Write tests for all new/modified APIs**
4. Run tests: `pnpm --filter hra test`
5. Format: `pnpm --filter hra format`
6. Type check: `pnpm --filter hra typecheck`
7. Commit and push

## Code Style & Conventions

### Import Ordering
1. Standard library (`node:*`)
2. Third-party packages
3. Internal modules
4. Type imports (group separately)

```typescript
import fs from 'node:fs';
import { Request, Response } from 'express';
import { Octokit } from 'octokit';
import Result from './utils/Result.js';
import type { TaskConfig } from './types.js';
```

### TypeScript Rules
- Strict mode, target ES2022, ESNext modules
- Explicit return types preferred (warn)
- No `any` type - use `unknown`
- No unused vars/params unless prefixed with `_`
- Implicit returns: error
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
Use `Result` class from `src/utils/Result.ts`:

```typescript
// Success
res.json(new Result(data, 200, 'Success'));

// Error
res.json(new Result().error(404, 'Not found'));

// Response structure
{ code: number, message: string, data: T }
```

### Formatting (Prettier)
- 2 space indent, single quotes
- Semicolons required, trailing commas: never
- Arrow parens: always, print width: 100

### Code Complexity
- Max depth: 3
- Max params: 4 (warn)
- Max lines per function: 100 (warn)
- Complexity: C10 (warn)
- No magic numbers (except -1, 0, 1, 2)

## Testing Guidelines

- Framework: Vitest (globals enabled, node environment)
- Pattern: `describe`/`it`
- Test files: `*.test.ts` or `*.spec.ts`
- Mock external dependencies
- All APIs, utilities, error scenarios must be tested

## File Organization

```
packages/hr-agent/src/
├── index.ts           # Express app entry
├── routes/            # API handlers (auto-loaded)
├── middleware/        # Express middleware
├── services/          # Business logic
├── tasks/             # Task orchestration
├── utils/             # Utilities
├── config/            # Configuration
└── prisma/            # Database schema
```

## Special Features

### Auto-Load Routes
- Middleware: `src/middleware/autoLoadRoutes.ts`
- HTTP method suffix: `routeName.get.ts`, `routeName.post.ts`
- Dynamic routes: `[id].ts` → `:id` parameter
- Example: `routes/v1/hello.get.ts` → `GET /v1/hello`

### GitHub Webhooks
- Issues: `routes/v1/webhooks/issues.post.ts`
- PRs: `routes/v1/webhooks/pullRequests.post.ts`
- HMAC verification via `crypto.timingSafeEqual`

## Best Practices

- Prefer `const` over `let`
- Use template literals and destructuring
- Object shorthand: `{ x }` over `{ x: x }`
- `async/await` over promises
- No `console/debugger` in production
- Use Result class for all API responses
