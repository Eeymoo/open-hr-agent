# AGENTS.md - Repository-specific Agent Guidelines

## Project Overview

GitHub-based AI self-orchestrated task management tool Monorepo. Uses pnpm workspace to manage packages, containing hr-agent (HRA) and coding-agent (CA) two packages. HRA handles Issue task management and PR reviews, CA handles specific coding tasks.

## Environment Detection

- Project Type: TypeScript Monorepo (pnpm workspace)
- Package Manager: pnpm (>=9.0.0)
- Module System: ES Modules (type: "module" in package.json)
- Runtime: Node.js >= 22.21.1
- Packages: hra (hr-agent), ca (coding-agent)

## Primary Commands (run at repository root)

### Dependency Management

- Install: `pnpm install` (installs all workspace packages)
- Install specific package: `pnpm add <package> --filter hra` or `--filter ca`

### Build & Type Checking

- Build all: `pnpm run build` (builds all packages)
- Build specific: `pnpm --filter hra build` or `pnpm --filter ca build`
- Type Check: `pnpm run typecheck` (checks all packages)
- Check: `pnpm run check` (typecheck + lint for all packages)

### Code Quality

- Lint all: `pnpm run lint` (lints all packages)
- Format all: `pnpm run format` (formats all packages)
- Format specific: `pnpm --filter hra format`

### Testing

- Run all tests: `pnpm --filter hra test`
- Run single test file: `pnpm --filter hra test src/routes.test.ts`
- Run test by pattern: `pnpm --filter hra test -- --grep "test name"`
- Run tests with coverage: `pnpm --filter hra test:coverage`
- Run tests in watch mode: `pnpm --filter hra test -- --watch`

### Running Applications

- HRA Dev: `pnpm --filter hra dev` (nodemon with hot reload in packages/hr-agent/)
- HRA Prod: `pnpm --filter hra start` (runs compiled packages/hr-agent/dist/index.js)
- CA Dev: `pnpm --filter ca dev` (when CA has dev script)

## Development Workflow

When developing new features, follow these steps:

1. Switch to main branch: `git checkout main`
`2. Pull latest from remote: `git pull origin main`
3. Create feature branch: `git checkout -b feature/your-feature-name`
4. Develop the feature
5. **Add test cases for all new/modified APIs (required for all new/modified APIs)**
6. Run tests: `pnpm --filter hra test` (must ensure all tests pass)
7. Format code: `pnpm run format`
8. Type check: `pnpm run typecheck`
9. Push to remote: `git push -u origin feature/your-feature-name`

**Testing Requirements:**
- All new or modified APIs must have corresponding test cases
- Must run `pnpm --filter hra test` before committing to ensure all tests pass
- Commit is prohibited when tests fail
- Test files should have the same name as source files, using `.test.ts` or `.spec.ts` suffix

## Code Style & Conventions

### Import Ordering

1. Standard library imports (node:\*)
2. Third-party package imports
3. Internal module imports (from src/ or packages/)
4. Type imports: group separately if using import type

```typescript
import fs from "node:fs";
import crypto from "node:crypto";
import { Request, Response } from "express";
import { encode } from "@toon-format/toon";
import Result from "./utils/Result.js";
```

### TypeScript Configuration

- Strict mode: enabled
- Target: ES2022
- Module: ESNext with bundler resolution
- Unused variables/parameters: error (ignored if prefixed with \_)
- Implicit returns: error
- No inferrable types: allowed (off)

### Naming Conventions

- Variables/Functions: camelCase
- Constants (true constants): UPPER_SNAKE_CASE
- Classes/Interfaces: PascalCase
- Private members: \_leadingUnderscore
- Files: camelCase.ts (matching exports)
- Directories: camelCase
- Dynamic routes: [id].ts → :id parameter
- Test files: sourceFileName.test.ts or sourceFileName.spec.ts

### Type Rules

- Explicit types preferred for function returns (warn)
- No `any` type allowed (error)
- Use `unknown` over `any` when type is truly unknown
- Prefer optional chaining (?.) and nullish coalescing (??)
- Non-null assertions discouraged (warn)

### Error Handling

Use `Result` class from packages/hr-agent/src/utils/Result.ts for API responses:

- Success: `new Result(data, 200, message)` or `new Result(data).success(data, message?)`
- Error: `new Result().error(code, message, data?)`
- Throw Error objects with descriptive messages, not literals
- Handle errors with try-catch and return Result responses

```typescript
app.get('/api/v1/endpoint', (_req: Request, res: Response) => {
  const data = processData();
  res.json(new Result(data));
));
```

### Code Complexity (ESLint enforced)

- Max depth: 3
- Max params: 4 (warn)
- Max lines per function: 100 (warn)
- Max statements: 30 (warn)
- Complexity: C10 (warn)
- Max nested: callbacks: 3

### Formatting Rules

- Indent: 2 spaces
- Quotes: single quotes (avoid escape with double)
- Semicolons: required
- Trailing commas: never
- Arrow function parens: always `() => {}`
- No multiple empty lines (max 1)

### Best Practices

- Prefer const over let
- Use template literals over string concatenation
- Object shorthand: `{ x }` over `{ x: x }`
- Destructuring preferred for arrays/objects
- No magic numbers (warn) - use named constants
- No console/debugger in production code
- Avoid eval, new Function
- Use async/await for async operations

## Testing Guidelines

### Test Structure

- Unit tests: Place next to source files or in `__tests__` directory
- Integration tests: Place in `src/` with `.test.ts` suffix
- Use describe/it pattern for grouping tests
- Use beforeEach/afterEach for setup/teardown
- Mock external dependencies (network, filesystem, database)

### Test Coverage Requirements

- All public API endpoints must have tests
- All utility functions must have tests
- All error scenarios must be tested
- Webhook signature verification must be tested
- Edge cases (null, undefined, empty arrays) must be covered

### Test Framework (Vitest)

- Location: `packages/hr-agent/vitest.config.ts`
- Includes: `src/**/*.{test,spec}.ts`
- Environment: node
- Globals: enabled (describe, it, expect available globally)

## Middleware & Special Features (HRA Package)

### Auto-Load Routes Middleware

- Location: `packages/hr-agent/src/middleware/autoLoadRoutes.ts`
- Automatically loads routes from packages/hr-agent/src/routes directory
- Supports Next.js style dynamic routes: [id].ts → :id
- Route structure: src/routes/v1/hello.ts → /v1/hello
- Route structure: src/routes/v1/[id]/index.ts → /v1/:id

### Toon Format Middleware

- Location: `packages/hr-agent/src/middleware/responseFormat/toonMiddleware.ts`
- Intercepts `/toon/*` path prefix
- Encodes JSON responses using Toon format (`@to`-format/toon`)
- Example: `/toon/api/v1/hello` returns Toon-encoded response

### GitHub Webhooks

- Issues webhook: `packages/hr-agent/src/routes/v1/webhooks/issues.ts`
- Pull requests webhook: `packages/hr-agent/src/routes/v1/webhooks/pullRequests.ts`
- Includes HMAC signature verification using crypto.timingSafeEqual
- Defensive programming with null checks and error boundaries

### Response Structure

```typescript
{
  code: number,
  message: string,
  data: T
}
```

## Agent Commit Strategy

- Small, focused commits
- Format: `type(scope): description` (feat, fix, refactor, style, docs, test, chore)
- Run format and lint before committing
- **Run tests before committing (mandatory)**
- Never commit secrets
- **Test failure should block commit**

## Safety Rules

- Never modify git config
- Never force push unless explicitly requested
- Never push to remote main/master without confirmation
- Validate no secrets in commits/logs

## Troubleshooting

- Build fails: Check TypeScript errors in specific package
- Lint fails: Review ESLint messages
- Typecheck fails: Ensure strict compliance
- Test fails: Review test output, check mocks and assertions
- Always run typecheck and tests before committing

## File Organization (HRA Package)

- `packages/hr-agent/src/index.ts` - Main entry point, Express app setup
- `packages/hr-agent/src/routes/` - API route handlers (auto-loaded)
- `packages/hr-agent/src/middleware/` - Express middleware
- `packages/hr-agent/src/utils/` - Utility classes/functions
- `packages/hr-agent/dist/` - Compiled output (gitignored)
- `packages/hr-agent/vitest.config.ts` - Test configuration
