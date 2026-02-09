# AGENTS.md - Repository-specific Agent Guidelines

## Project Overview

GitHub-based AI self-orchestrated task management tool Monorepo. Uses pnpm workspace to manage packages: hra (HR Agent) handles Issue task management and PR reviews, ca (Coding Agent) handles coding tasks.

## Environment

- Project Type: TypeScript Monorepo (pnpm workspace)
- Package Manager: pnpm >= 9.0.0
- Module System: ES Modules
- Runtime: Node.js >= 22.0.0
- Packages: hra, ca

## Primary Commands

### Dependency & Build
- Install: `pnpm install`
- Build all: `pnpm run build`
- Build specific: `pnpm --filter hra build`
- Type check all: `pnpm run typecheck`

### Code Quality
- Lint all: `pnpm run lint`
- Format all: `pnpm run format`
- Check: `pnpm run check` (typecheck + lint)

### Testing
- Run all tests: `pnpm --filter hra test`
- Run single test file: `pnpm --filter hra test src/routes.test.ts`
- Run test by pattern: `pnpm --filter hra test -- --grep "test name"`
- Run tests with coverage: `pnpm --filter hra test:coverage`

### Running Applications
- HRA Dev: `pnpm --filter hra dev`
- HRA Prod: `pnpm --filter hra start`

## Development Workflow

1. Create feature branch from main
2. Develop feature
3. **Add test cases for all new/modified APIs**
4. Run tests: `pnpm --filter hra test` (must pass before commit)
5. Format: `pnpm run format`
6. Type check: `pnpm run typecheck`
7. Commit and push

**Testing Requirements:**
- All new/modified APIs must have test cases
- Tests must pass before committing (mandatory)
- Test files: sourceFileName.test.ts or sourceFileName.spec.ts

## Code Style & Conventions

### Import Ordering
1. Standard library imports (node:*)
2. Third-party package imports
3. Internal module imports (from src/ or packages/)
4. Type imports (group separately if using import type)

```typescript
import fs from "node:fs";
import crypto from "node:crypto";
import { Request, Response } from "express";
import { encode } from "@toon-format/toon";
import Result from "./utils/Result.js";
```

### TypeScript Config
- Strict mode: enabled
- Target: ES2022, Module: ESNext with bundler resolution
- No unused variables/parameters (ignored if prefixed with _)
- Implicit returns: error
- No inferrable types: off

### Naming Conventions
- Variables/Functions: camelCase
- Constants (true constants): UPPER_SNAKE_CASE
- Classes/Interfaces: PascalCase
- Private members: _leadingUnderscore
- Files: camelCase.ts (matching exports)
- Directories: camelCase
- Dynamic routes: [id].ts → :id parameter

### Type Rules
- Explicit return types preferred (warn)
- No `any` type allowed (error) - use `unknown`
- Prefer optional chaining (?.) and nullish coalescing (??)
- Non-null assertions discouraged (warn)

### Error Handling

Use `Result` class from packages/hr-agent/src/utils/Result.ts for API responses:
- Success: `new Result(data, 200, message)` or `new Result(data).success(data, message?)`
- Error: `new Result().error(code, message, data?)`

```typescript
app.get('/api/v1/endpoint', (_req: Request, res: Response) => {
  const data = processData();
  res.json(new Result(data));
));
```

### Code Complexity
- Max depth: 3
- Max params: 4 (warn)
- Max lines per function: 100 (warn)
- Max statements: 30 (warn)
- Complexity: C10 (warn)

### Formatting Rules
- Indent: 2 spaces
- Quotes: single (use double for escape)
- Semicolons: required
- Trailing commas: never
- Arrow function parens: always `() => {}`
- No multiple empty lines (max 1)

### Best Practices
- Prefer const over let
- Use template literals over concatenation
- Object shorthand: `{ x }` over `{ x: x }`
- Destructuring preferred
- No magic numbers - use named constants
- No console/debugger in production
- Avoid eval, new Function
- Use async/await

## Testing Guidelines

- Use describe/it pattern
- Mock external dependencies
- All public APIs, utilities, and error scenarios must be tested
- Test framework: Vitest (node environment, globals enabled)

## Special Features

### Auto-Load Routes
- Location: packages/hr-agent/src/middleware/autoLoadRoutes.ts
- Supports Next.js style dynamic routes: [id].ts → :id
- Route structure: src/routes/v1/hello.ts → /v1/hello

### GitHub Webhooks
- Issues webhook: packages/hr-agent/src/routes/v1/webhooks/issues.ts
- PR webhook: packages/hr-agent/src/routes/v1/webhooks/pullRequests.ts
- HMAC signature verification using crypto.timingSafeEqual

### Response Structure
```typescript
{ code: number, message: string, data: T }
```

## Commit Strategy

- Format: `type(scope): description` (feat, fix, refactor, style, docs, test, chore)
- Run format, lint, and tests before committing
- Never commit secrets
- Test failure must block commit

## Safety Rules

- Never modify git config
- Never force push unless requested
- Never push to remote main/master without confirmation
- Validate no secrets in commits/logs

## File Organization (HRA Package)

- `packages/hr-agent/src/index.ts` - Main entry point, Express app setup
- `packages/hr-agent/src/routes/` - API route handlers (auto-loaded)
- `packages/hr-agent/src/middleware/` - Express middleware
- `packages/hr-agent/src/utils/` - Utility classes/functions
- `packages/hr-agent/dist/` - Compiled output (gitignored)
