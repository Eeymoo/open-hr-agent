# AGENTS.md - Repository-specific Agent Guidelines

## Project Overview

TypeScript Express API project providing structured responses with Toon format encoding. Uses ES modules, targets Node.js >= 18.0.0.

## Environment Detection

- Project Type: TypeScript + Express (Node.js)
- Package Manager: pnpm
- Module System: ES Modules (type: "module" in package.json)

## Primary Commands (run at repository root)

### Dependency Management

- Install: `pnpm install`

### Build & Type Checking

- Build: `pnpm run build` (compiles TypeScript to dist/)
- Type Check: `pnpm run typecheck` (tsc --noEmit)
- Check: `pnpm run check` (typecheck + lint)

### Code Quality

- Lint: `pnpm run lint` (ESLint with TypeScript support)
- Format: `pnpm run format` (Prettier formatting)

### Running the Application

- Development: `pnpm run dev` (nodemon with hot reload, watches src/ directory)
- Production: `pnpm start` (runs compiled dist/index.js)

### Testing

No test framework configured. Add test commands when tests are implemented.

## Code Style & Conventions

### Import Ordering

1. Standard library imports (node:\*)
2. Third-party package imports
3. Internal module imports (from src/)
4. Type imports: group separately if using import type

```typescript
import fs from 'node:fs';
import express, { type Request, type Response } from 'express';
import Result from './utils/Result.js';
```

### TypeScript Configuration

- Strict mode: enabled
- Target: ES2022
- Module: ESNext with bundler resolution
- Unused variables/parameters: error (ignored if prefixed with \_)
- Implicit returns: error
- No inferrable types: allowed

### Naming Conventions

- Variables/Functions: camelCase
- Constants (true constants): UPPER_SNAKE_CASE
- Classes/Interfaces: PascalCase
- Private members: \_leadingUnderscore
- Files: camelCase.ts (matching exports)
- Directories: camelCase

### Type Rules

- Explicit types preferred for function returns (warn)
- No `any` type allowed (error)
- Use `unknown` over `any` when type is truly unknown
- Prefer optional chaining (?.) and nullish coalescing (??)
- Non-null assertions discouraged (warn)

### Error Handling

Use `Result` class from src/utils/Result.ts for API responses:

- Success: `new Result(data, 200, message)` or `new Result(data).success(data, message?)`
- Error: `new Result().error(code, message, data?)`
- Throw Error objects with descriptive messages, not literals
- Handle errors with try-catch and return Result responses

```typescript
app.get('/api/v1/endpoint', (_req: Request, res: Response) => {
  const data = processData();
  res.json(new Result(data));
});
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

## Middleware & Special Features

### Toon Format Middleware

- Location: `/src/middleware/responseFormat/toonMiddleware.ts`
- Intercepts `/toon/*` path prefix
- Encodes JSON responses using Toon format (`@to`-format/toon`)
- Example: `/toon/api/v1/hello` returns Toon-encoded response

### Response Structure

```typescript
{
  code: number,
  message: string,
  data: T
}
```

## Git Workflow

1. Create new branch before modifications
2. No operations on main/master without explicit instruction
3. Commit to current branch with descriptive message
4. Push to remote after work complete

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

- Build fails: Check TypeScript errors
- Lint fails: Review ESLint messages
- Typecheck fails: Ensure strict compliance
- Always run typecheck before committing

## File Organization

- `/src/index.ts` - Main entry point, Express app setup
- `/src/routes/` - API route handlers
- `/src/middleware/` - Express middleware
- `/src/utils/` - Utility classes/functions
- `/dist/` - Compiled output (gitignored)
