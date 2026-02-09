# AGENTS.md - HR Agent Package Guidelines

## Package Overview

HR Agent (hra) - Express-based backend service for GitHub Issue/PR management and task orchestration. Handles webhooks, task scheduling, and agent coordination.

## Environment

- Language: TypeScript (ES Modules)
- Runtime: Node.js >= 22.0.0
- Package Manager: pnpm >= 9.0.0
- Framework: Express 5
- Database: Prisma ORM
- Testing: Vitest

## Primary Commands

### Build & Type Check
- Build: `pnpm --filter hra build` (tsc compilation)
- Type check: `pnpm --filter hra typecheck`
- Watch build: `nodemon` (dev mode)

### Code Quality
- Lint: `pnpm --filter hra lint` (eslint src)
- Format: `pnpm --filter hra format` (prettier --write src)
- Check all: `pnpm --filter hra check` (typecheck + lint)

### Testing
- Run all: `pnpm --filter hra test`
- Single file: `pnpm --filter hra test src/routes.test.ts`
- By pattern: `pnpm --filter hra test -- --grep "test name"`
- Coverage: `pnpm --filter hra test:coverage`
- UI mode: `pnpm --filter hra test:ui`

### Database (Prisma)
- Generate client: `pnpm --filter hra prisma:generate`
- Migrate dev: `pnpm --filter hra prisma:migrate`
- Push schema: `pnpm --filter hra prisma:push`
- Open studio: `pnpm --filter hra prisma:studio`
- Full setup: `pnpm --filter hra db:setup`

### Running
- Dev: `pnpm --filter hra dev` (nodemon hot-reload)
- Prod: `pnpm --filter hra start` (node dist/index.js)

## Development Workflow

1. Create feature branch from main
2. Develop feature with type-safe code
3. **Write tests for all new/modified APIs**
4. Run tests: `pnpm --filter hra test` (must pass)
5. Format: `pnpm --filter hra format`
6. Type check: `pnpm --filter hra typecheck`
7. Commit and push

## Code Style & Conventions

### Import Ordering
1. Standard library (node:*)
2. Third-party packages
3. Internal modules (from src/ or packages/)
4. Type imports (group separately if using import type)

```typescript
import fs from "node:fs";
import { Request, Response } from "express";
import { encode } from "@toon-format/toon";
import Result from "./utils/Result.js";
```

### TypeScript Rules
- Strict mode: enabled
- Explicit return types: warn
- No `any` type: error (use `unknown`)
- No unused vars/params unless prefixed with `_`
- Implicit returns: error
- Non-null assertions: warn

### Naming Conventions
- Variables/Functions: camelCase
- Constants: UPPER_SNAKE_CASE
- Classes/Interfaces: PascalCase
- Private members: _leadingUnderscore
- Files: camelCase.ts
- Routes: name.method.ts (e.g., issues.post.ts, pullRequests.get.ts)

### Error Handling
Use `Result` class from src/utils/Result.ts:
- Success: `new Result(data, 200, message)` or `new Result(data).success(data, message?)`
- Error: `new Result().error(code, message, data?)`

```typescript
app.get('/api/endpoint', (_req: Request, res: Response) => {
  const data = processData();
  res.json(new Result(data));
});
```

### Formatting (Prettier)
- 2 space indent
- Single quotes (double for escape)
- Semicolons: required
- Trailing commas: never
- Arrow parens: always
- Print width: 100

### Code Complexity
- Max depth: 3
- Max params: 4 (warn)
- Max lines/function: 100 (warn)
- Complexity: C10 (warn)
- No magic numbers (except -1, 0, 1, 2)

## Testing Guidelines

- Framework: Vitest (globals enabled, node environment)
- Pattern: describe/it
- Mock external dependencies
- Test files: *.test.ts or *.spec.ts in src/
- All public APIs, utilities, error scenarios must be tested

## File Organization

- `src/index.ts` - Express app setup
- `src/routes/` - API route handlers (auto-loaded)
- `src/middleware/` - Express middleware
- `src/services/` - Business logic services
- `src/utils/` - Utility classes/functions
- `src/tasks/` - Task orchestration logic
- `src/config/` - Configuration management
- `dist/` - Compiled output (gitignored)

## Special Features

### Auto-Load Routes
- Middleware: src/middleware/autoLoadRoutes.ts
- HTTP method suffix: routeName.get.ts, routeName.post.ts
- Dynamic routes: [id].ts → :id parameter
- Example: routes/v1/hello.get.ts → GET /v1/hello

### GitHub Webhooks
- Issues: routes/v1/webhooks/issues.post.ts
- PRs: routes/v1/webhooks/pullRequests.post.ts
- HMAC verification: crypto.timingSafeEqual

## Best Practices

- Prefer const over let
- Use template literals
- Object shorthand: `{ x }` over `{ x: x }`
- Destructuring preferred
- Async/await over promises
- No console/debugger in production
- Use Result class for all API responses
