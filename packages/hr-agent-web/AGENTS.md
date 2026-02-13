# AGENTS.md - HR Agent Web Package Guidelines

## Package Overview

HR Agent Web - React-based frontend for task management UI.

## Environment

- Language: TypeScript (ES Modules)
- Framework: React 18 + Vite
- UI Library: Ant Design 5
- Styling: Tailwind CSS
- State: TanStack Query

## Primary Commands

### Build & Development
```bash
pnpm dev        # Start dev server (Vite)
pnpm build      # Build for production
pnpm preview    # Preview production build
```

### Code Quality
```bash
pnpm typecheck  # Type check
pnpm lint       # ESLint check
pnpm format     # Prettier format
```

## Development Workflow

1. Sync code: `git fetch origin main && git rebase origin/main`
2. Develop feature with appropriate error/loading states
3. Run `pnpm typecheck && pnpm lint` before commit
4. Commit with Conventional Commits format

## Code Style & Conventions

### Import Ordering
1. React core (`react`, `react-dom`)
2. Third-party packages (`antd`, `axios`)
3. Internal modules (`@/` alias)
4. Relative imports
5. Type imports

```tsx
import React, { useState } from 'react';
import { Button } from 'antd';
import { api } from '@/api/client';
import type { Issue } from '@/types/issue';
```

### TypeScript Rules
- Strict mode, JSX: react-jsx
- Use `@/*` path alias for src imports
- No unused locals/params

### Naming Conventions
| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `TaskCard.tsx` |
| Hooks | use + PascalCase | `useIssues.ts` |
| Utils | camelCase | `formatters.ts` |
| Types | PascalCase | `issue.ts` |

### Component Structure
```tsx
import React from 'react';
import './ComponentName.css';

interface ComponentNameProps {
  title: string;
}

export default function ComponentName({ title }: ComponentNameProps) {
  return <div className="component-name">{title}</div>;
}
```

### Styling Guidelines
- Use Tailwind CSS for utility classes
- Use CSS files for complex component styles
- Follow BEM-like naming: `.component-name`, `.component-name__element`

### API & State Management
- Use `@/api/client.ts` for base axios instance
- Use TanStack Query hooks (`useQuery`, `useMutation`)
- Place API functions in `@/api/`, hooks in `@/hooks/`

## File Organization

```
src/
├── api/           # API client and endpoints
├── components/    # Reusable UI components
├── hooks/         # Custom React hooks
├── pages/         # Page-level components
├── routes/        # React Router configuration
├── types/         # TypeScript type definitions
├── utils/         # Utility functions
├── App.tsx        # Root component
└── main.tsx       # Entry point
```

## Routing

- `/` → Redirects to `/issues`
- `/issues` - Issues list, `/issues/:id` - Detail
- `/prs` - PRs list, `/prs/:id` - Detail
- `/cas` - Coding Agents list
- `/tasks` - Task orchestration
