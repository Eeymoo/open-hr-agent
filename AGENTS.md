# AGENTS.md - Repository-specific Agent Guidelines

## Project Overview

This is a TypeScript Express API project that provides structured API responses with optional Toon format encoding. The project uses ES modules and targets Node.js >= 18.0.0.

## Environment Detection

- Project Type: TypeScript + Express (Node.js)
- Package Manager: pnpm (detected from pnpm-lock.yaml)
- Module System: ES Modules (type: "module" in package.json)

## Primary Commands (run at repository root)

### Dependency Management

- Install: `pnpm install`

### Build & Type Checking

- Build: `pnpm run build` (compiles TypeScript to dist/)
- Type Check: `pnpm run typecheck` (tsc --noEmit)

### Code Quality

- Lint: `pnpm run lint` (ESLint with TypeScript support)
- Format: `pnpm run format` (Prettier for formatting)

### Running the Application

- Development: `pnpm run dev` (tsx src/index.ts with hot reload)
- Production: `pnpm start` (runs compiled dist/index.js)

### Testing

Note: No test framework is currently configured in package.json. If tests are added, update this section.

## Code Style & Conventions

### Import Ordering (enforced by ESLint)

1. Standard library imports (node:\*)
2. Third-party package imports
3. Internal module imports (from src/)
4. Type imports can be grouped separately if using import type

Example:

```typescript
import fs from "node:fs";
import express, { type Request, type Response } from "express";
import Result from "./utils/Result.js";
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

- Explicit types preferred for function returns (warn level)
- No `any` type allowed (error level)
- Use `unknown` over `any` when type is truly unknown
- Prefer optional chaining (?.) and nullish coalescing (??)
- Non-null assertions discouraged (warn level)

### Error Handling

- Use the `Result` class from src/utils/Result.ts for API responses
- Constructor: `new Result(data, code?, message?)`
- Error responses: `new Result().error(code, message, data?)`
- Success responses: `new Result(data, 200, message)` or `new Result(data).success(data, message?)`
- Avoid throwing literals; throw Error objects with descriptive messages
- Handle errors with try-catch and return appropriate Result responses

### Express Route Patterns

```typescript
app.get("/api/v1/endpoint", (_req: Request, res: Response) => {
  const data = processData();
  res.json(new Result(data));
});

app.get("/api/v1/error", (_req: Request, res: Response) => {
  res.json(new Result().error(400, "Error message"));
});
```

### Code Complexity (ESLint enforced)

- Max depth: 3
- Max params: 4 (warn)
- Max lines per function: 100 (warn)
- Max statements: 30 (warn)
- Complexity: C10 (warn)
- Max nested callbacks: 3

### Formatting Rules (ESLint enforced)

- Indent: 2 spaces
- Quotes: single quotes (avoid escape with double)
- Semicolons: required
- Trailing commas: never
- Spaces: strict spacing around operators, braces, etc.
- No multiple empty lines (max 1)
- Arrow function parens: always `() => {}`

### Best Practices

- Prefer const over let
- Use template literals over string concatenation
- Object shorthand preferred: `{ x }` over `{ x: x }`
- Destructuring preferred for arrays and objects
- No magic numbers (warn) - use named constants
- No console or debugger in production code
- Avoid eval, new Function, and other dangerous patterns
- Use async/await for asynchronous operations

## Middleware & Special Features

### Toon Format Middleware

The project includes `/src/middleware/responseFormat/toonMiddleware.ts` which:

- Intercepts requests under `/toon` path prefix
- Encodes JSON responses using Toon format (`@toon-format/toon`)
- Example: `/toon/api/v1/hello` returns Toon-encoded response

### Response Structure

All API responses should use the `Result` class with structure:

```typescript
{
  code: number,
  message: string,
  data: T
}
```

## Git Workflow (Critical)

1. Always create a new branch before any modifications
2. No operations allowed on main/master without explicit instruction
3. After completing partial work, commit to current branch with descriptive message
4. After all work complete, push to remote repository
5. If issues arise, provide clear error messages and suggestions

## Agent Commit Strategy

- Small, focused commits
- Commit message format: `type(scope): description`
- Types: feat, fix, refactor, style, docs, test, chore
- Include context in commit messages
- Never commit secrets or sensitive data
- Run format and lint before committing

## Safety Rules

- Never modify git config
- Never force push unless explicitly requested
- Never push to remote main/master without user confirmation
- Check for secrets before committing
- Validate sensitive data is not logged

## Troubleshooting

- If build fails: Check TypeScript errors in output
- If lint fails: Review ESLint messages and fix violations
- If typecheck fails: Address type errors and ensure strict compliance
- Always run typecheck before committing

## File Organization

- `/src/index.ts` - Main entry point, Express app setup
- `/src/middleware/` - Express middleware modules
- `/src/utils/` - Utility classes and functions
- `/dist/` - Compiled output (generated, ignore in version control)
