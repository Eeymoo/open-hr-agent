# AGENTS.md - HR Agent Web Package Guidelines

## Package Overview

HR Agent Web - React-based frontend for task management. Provides UI for Issues, PRs, CAs (Coding Agents), and Task Orchestration.

## Environment

- Language: TypeScript (ES Modules)
- Runtime: Node.js >= 22.0.0
- Package Manager: pnpm >= 9.0.0
- Framework: React 18 + Vite
- UI Library: Ant Design 5
- Styling: Tailwind CSS
- State: TanStack Query (React Query)

## Primary Commands

### Build & Development
```bash
pnpm --filter hr-agent-web dev      # Start dev server (Vite)
pnpm --filter hr-agent-web build    # Build for production
pnpm --filter hr-agent-web preview  # Preview production build
```

### Code Quality
```bash
pnpm --filter hr-agent-web typecheck  # Type check
pnpm --filter hr-agent-web lint        # ESLint check
pnpm --filter hr-agent-web format      # Prettier format
```

## Code Style & Conventions

### Import Ordering
1. React core (`react`, `react-dom`)
2. Third-party packages (`antd`, `axios`, etc.)
3. Internal modules (`@/` alias)
4. Relative imports
5. Type imports (group separately)

```tsx
import React, { useState, useEffect } from 'react';
import { Button, Table } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import type { Issue } from '@/types/issue';
```

### TypeScript Rules
- Strict mode enabled
- JSX: react-jsx
- No unused locals/params
- Use `@/*` path alias for src imports

### Naming Conventions
| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `TaskCard.tsx` |
| Hooks | use + PascalCase | `useIssues.ts` |
| Utils | camelCase | `formatters.ts` |
| Types | PascalCase | `issue.ts` |
| CSS Modules | same as component | `TaskCard.css` |

### Component Structure
```tsx
// 1. Imports
import React from 'react';
import './ComponentName.css';

// 2. Types
interface ComponentNameProps {
  title: string;
}

// 3. Component
export default function ComponentName({ title }: ComponentNameProps) {
  return <div className="component-name">{title}</div>;
}
```

### Styling Guidelines
- Use Tailwind CSS for utility classes
- Use CSS files for complex component styles
- Follow BEM-like naming: `.component-name`, `.component-name__element`
- Use CSS variables from themes

### API & State Management
- Use `@/api/client.ts` for base axios instance
- Use TanStack Query hooks (`useQuery`, `useMutation`)
- Place API functions in `@/api/` directory
- Place hooks in `@/hooks/` directory

## File Organization

```
packages/hr-agent-web/src/
├── api/           # API client and endpoints
├── components/    # Reusable UI components
├── hooks/         # Custom React hooks
├── pages/         # Page-level components
├── routes/        # React Router configuration
├── themes/        # Theme configuration
├── types/         # TypeScript type definitions
├── utils/         # Utility functions
├── App.tsx        # Root component
├── main.tsx       # Entry point
└── index.css      # Global styles
```

## Best Practices

- Prefer functional components with hooks
- Use React Query for server state
- Handle loading and error states
- Use Ant Design components when possible
- Keep components small and focused
- Extract reusable logic into custom hooks
- Use TypeScript strict mode
- Avoid inline styles (use CSS or Tailwind)

## Routing

Pages are defined in `src/routes/index.tsx`:
- `/` - Redirects to `/issues`
- `/issues` - Issues list
- `/issues/:id` - Issue detail
- `/prs` - PRs list
- `/prs/:id` - PR detail
- `/cas` - Coding Agents list
- `/tasks` - Task orchestration
