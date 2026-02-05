# AGENTS.md - Repository-specific Agent Guidelines

## Project Overview

基于 Github 的 AI 自编排任务管理工具 Monorepo。使用 pnpm workspace 管理 packages，包含 hr-agent（HRA）和 coding-agent（CA）两个包。HRA 负责管理 Issue 任务和 PR 审查，CA 负责具体的编码工作。

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

### Running Applications

- HRA Dev: `pnpm --filter hra dev` (nodemon with hot reload in packages/hr-agent/)
- HRA Prod: `pnpm --filter hra start` (runs compiled packages/hr-agent/dist/index.js)
- CA Dev: `pnpm --filter ca dev` (when CA has dev script)

### Testing

No test framework configured. Add test commands when tests are implemented.

## Monorepo Structure

```
open-hr-agent/
├── packages/
│   ├── hr-agent/        # HRA 包 (Express API)
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── middleware/    # 自动加载路由、Toon 格式中间件
│   │   │   ├── routes/         # API 路由 (自动加载)
│   │   │   └── utils/          # 工具类
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── coding-agent/    # CA 包 (基于 OpenCode 的编码 Agent)
│       ├── package.json
│       └── src/
├── package.json         # 根 package.json (workspace 管理)
└── pnpm-workspace.yaml
```

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
- Max nested callbacks: 3

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

## Git Workflow

When developing new features, follow these steps:

1. Switch to main branch: `git checkout main`
2. Pull latest from remote: `git pull origin main`
3. Create feature branch: `git checkout -b feature/your-feature-name`
4. Develop the feature
5. Format code: `pnpm run format`
6. Type check: `pnpm run typecheck`
7. Push to remote: `git push -u origin feature/your-feature-name`

## Agent Commit Strategy

- Small, focused commits
- Format: `type(scope): description` (feat, fix, refactor, style, docs, test, chore)
- Run format and lint before committing
- Never commit secrets

## Safety Rules

- Never modify git config
- Never force push unless explicitly requested
- Never push to remote main/master without confirmation
- Validate no secrets in commits/logs

## Troubleshooting

- Build fails: Check TypeScript errors in specific package
- Lint fails: Review ESLint messages
- Typecheck fails: Ensure strict compliance
- Always run typecheck before committing

## File Organization (HRA Package)

- `packages/hr-agent/src/index.ts` - Main entry point, Express app setup
- `packages/hr-agentra/src/routes/` - API route handlers (auto-loaded)
- `packages/hr-agent/src/middleware/` - Express middleware
- `packages/hr-agent/src/utils/` - Utility classes/functions
- `packages/hr-agent/dist/` - Compiled output (gitignored)
