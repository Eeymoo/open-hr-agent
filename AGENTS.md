# AGENTS.md - Repository-specific Agent Guidelines

## Project Overview

GitHub-based AI task management monorepo using pnpm workspace. Packages: hra (Issue/PR management), ca (coding tasks).

## Environment

- TypeScript Monorepo (pnpm workspace, ES modules)
- Package Manager: pnpm >= 9.0.0
- Runtime: Node.js >= 22.0.0

## Primary Commands

### Build & Type Check
- Install: `pnpm install`
- Build all: `pnpm run build`
- Build specific: `pnpm --filter hra build`
- Type check: `pnpm run typecheck`

### Code Quality
- Lint: `pnpm run lint`
- Format: `pnpm run format`
- Check: `pnpm run check` (typecheck + lint)

### Testing
- Run all: `pnpm --filter hra test`
- Single file: `pnpm --filter hra test src/routes.test.ts`
- By pattern: `pnpm --filter hra test -- --grep "test name"`
- Coverage: `pnpm --filter hra test:coverage`

### Database (Prisma)
- Generate: `pnpm --filter hra prisma:generate`
- Migrate: `pnpm --filter hra prisma:migrate`
- Push: `pnpm --filter hra prisma:push`
- Studio: `pnpm --filter hra prisma:studio`

### Running
- Dev: `pnpm --filter hra dev`
- Prod: `pnpm --filter hra start`

## Development Workflow

1. Create feature branch from main
2. Develop feature
3. **Write tests for all new/modified APIs**
4. Run tests: `pnpm --filter hra test` (must pass)
5. Format: `pnpm run format`
6. Type check: `pnpm run typecheck`
7. Commit and push

**Testing:** All new/modified APIs require test cases (*.test.ts or *.spec.ts). Tests must pass before commit.

## Code Style & Conventions

### Import Ordering
1. Standard library (node:*)
2. Third-party packages
3. Internal modules (from src/ or packages/)
4. Type imports (group separately if using import type)

```typescript
import fs from "node:fs";
import { Request, Response } from "express";
import Result from "./utils/Result.js";
```

### TypeScript Rules
- Strict mode enabled, target ES2022, ESNext modules with bundler resolution
- Explicit return types preferred (warn)
- No `any` type - use `unknown`
- No unused vars/params unless prefixed with `_`
- Implicit returns: error
- Prefer optional chaining (?.) and nullish coalescing (??)
- Non-null assertions discouraged (warn)

### Naming Conventions
- Variables/Functions: camelCase
- Constants: UPPER_SNAKE_CASE
- Classes/Interfaces: PascalCase
- Private members: _leadingUnderscore
- Files: camelCase.ts
- Routes: name.method.ts (e.g., issues.post.ts)

### Error Handling

Use `Result` class from packages/hr-agent/src/utils/Result.ts:
- Success: `new Result(data, 200, message)` or `new Result(data).success(data, message?)`
- Error: `new Result().error(code, message, data?)`

```typescript
app.get('/api/v1/endpoint', (_req: Request, res: Response) => {
  const data = processData();
  res.json(new Result(data));
});
```

### Code Complexity
- Max depth: 3
- Max params: 4 (warn)
- Max lines per function: 100 (warn)
- Complexity: C10 (warn)
- No magic numbers (except -1, 0, 1, 2)

### Formatting (Prettier)
- 2 space indent, single quotes (double for escape)
- Semicolons required, trailing commas: never
- Arrow parens: always, max 1 empty line

### Best Practices
- Prefer const over let, template literals, destructuring
- Object shorthand: `{ x }` over `{ x: x }`
- No console/debugger in production
- Avoid eval, new Function
- Use async/await

## Testing Guidelines

- Vitest (node environment, globals enabled)
- Use describe/it pattern, mock external dependencies
- All public APIs, utilities, error scenarios must be tested

## Special Features

### Auto-Load Routes
- Location: packages/hr-agent/src/middleware/autoLoadRoutes.ts
- HTTP method suffix: routeName.get.ts, routeName.post.ts
- Dynamic routes: [id].ts → :id parameter
- Example: routes/v1/hello.get.ts → GET /v1/hello

### GitHub Webhooks
- Issues: routes/v1/webhooks/issues.post.ts
- PRs: routes/v1/webhooks/pullRequests.post.ts
- HMAC verification: crypto.timingSafeEqual

### Response Structure
```typescript
{ code: number, message: string, data: T }
```

## Commit & Safety

- Format: `type(scope): description` (feat, fix, refactor, style, docs, test, chore)
- Run format, lint, tests before commit
- Never commit secrets
- Never modify git config, force push without request, or push to main/master without confirmation

## File Organization (HRA)

- `packages/hr-agent/src/index.ts` - Express app setup
- `packages/hr-agent/src/routes/` - API handlers (auto-loaded)
- `packages/hr-agent/src/middleware/` - Express middleware
- `packages/hr-agent/src/utils/` - Utilities
- `packages/hr-agent/src/services/` - Business logic
- `packages/hr-agent/dist/` - Compiled output (gitignored)
