# Open HR Agent (HRA)

An AI self-orchestrated task management tool based on GitHub. Create tasks via Issues, automatically write code through AI Coding Agent, and merge code via Pull Requests.

## Core Philosophy

HRA aims to build a self-improving AI Agent system with the following operational model:

1. **Task Creation**: Create tasks through GitHub Issues
2. **Employee Recruitment**: When an Issue is detected, HRA automatically creates (recruits) a Coding Agent (employee)
3. **Task Execution**: Coding Agent completes the coding task and submits a PR
4. **Human Review**: Humans review and merge the PR (this step can also be automated later)
5. **Employee Termination**: After PR is merged, HRA automatically destroys the Coding Agent

### Why This Design?

- **Cost Reduction**: HRA is not 24/7 operational; Coding Agents are only started when there are tasks
- **On-Demand Allocation**: Maximum number of concurrent Coding Agents can be configured for parallel processing
- **Git Native**: Fully based on GitHub/Git workflow without additional infrastructure
- **Extensible**: Coding Agents are swappable (currently using OpenCode, can be adjusted later)

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      GitHub Repository                        │
│  ┌──────────┐                                               │
│  │  Issues  │ ────► Triggers HRA to create Coding Agent       │
│  └──────────┘                                               │
│  ┌──────────┐                                               │
│  │   Pull   │ ────► PR merged triggers HRA to destroy Agent   │
│  │ Requests │       Humans review code quality               │
│  └──────────┘                                               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    HRA (HR Agent)                            │
│  - Listens to GitHub Webhooks (Issues, PRs)                  │
│  - Manages Coding Agent lifecycle (create/destroy)           │
│  - Configures max concurrent Agent count                     │
│  - Task queue management                                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Coding Agents (OpenCode/Other)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  Agent #1    │  │  Agent #2    │  │  Agent #N    │       │
│  │  ├─ Issue 1  │  │  ├─ Issue 3  │  │  ├─ Issue X  │       │
│  │  └─ PR #1    │  │  └─ PR #3    │  │  └─ PR #X    │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│         │                  │                  │              │
│         └──────────────────┴──────────────────┘              │
│                           │                                  │
│                           ▼                                  │
│                    Commit code to GitHub                      │
└─────────────────────────────────────────────────────────────┘
```

## Monorepo Structure

A pnpm workspace managed Monorepo:

```
open-hr-agent/
├── packages/
│   ├── hra/              # HR Agent - Task management and Agent lifecycle
│   │   ├── src/
│   │   │   ├── routes/   # API routes
│   │   │   │   └── v1/
│   │   │   │       └── webhooks/
│   │   │   │           ├── issues.ts      # Issue webhook handler
│   │   │   │           └── pullRequests.ts # PR webhook handler
│   │   │   ├── middleware/
│   │   │   │   └── autoLoadRoutes.ts      # Auto route loading
│   │   │   └── utils/
│   │   └── vitest.config.ts
│   │
│   └── coding-agent/     # Coding Agent (CA) - Executes coding tasks
│       └── src/
│
├── package.json          # Workspace config
├── AGENTS.md             # Agent development guide
└── README.md
```

## Quick Start

### Requirements

- Node.js >= 22.0.0
- pnpm >= 9.0.0
- Docker (optional, for managing Coding Agents)

### Local Development

```bash
# Switch to Node.js 22 using NVM
nvm use

# Install dependencies
pnpm install

# Start HRA dev server
pnpm --filter hra dev
```

### Main Commands

```bash
# Install all dependencies
pnpm install

# Build all packages
pnpm run build

# Type check
pnpm run typecheck

# Lint code
pnpm run lint

# Format code
pnpm run format

# Run tests
pnpm --filter hra test

# Full check (type check + lint)
pnpm run check
```

## Deployment

### Docker Deployment (Recommended)

#### Using GitHub Container Registry

```bash
# Pull latest image
docker pull ghcr.io/eeymoo/open-hr-agent:latest

# Run container
docker run -d -p 3000:3000 \
  --name open-hr-agent \
  -e GITHUB_TOKEN=your_github_token \
  -e MAX_CONCURRENT_AGENTS=3 \
  ghcr.io/eeymoo/open-hr-agent:latest
```

#### Using Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  hra:
    image: ghcr.io/eeymoo/open-hr-agent:latest
    container_name: hra
    ports:
      - '3000:3000'
    environment:
      - NODE_ENV=production
      - PORT=3000
      - GITHUB_TOKEN=${GITHUB_TOKEN}
      - MAX_CONCURRENT_AGENTS=${MAX_CONCURRENT_AGENTS:-3}
    restart: unless-stopped

  coding-agent:
    build:
      context: .
      dockerfile: packages/coding-agent/Dockerfile
    ports:
      - '4096:4096'
    environment:
      - NODE_ENV=production
      - PORT=4096
      - GITHUB_REPO_URL=${GITHUB_REPO_URL:-}
    volumes:
      - ${CODE_PATH:-./.}:/home/workspace/repo:ro
    restart: unless-stopped
```

Start service:

```bash
docker-compose up -d
```

#### Coding Agent Deployment Methods

The Coding Agent supports three deployment methods:

**Method 1: Mount Local Code Directory**
```bash
CODE_PATH=/path/to/your/repo docker-compose up -d coding-agent
```

**Method 2: Clone GitHub Repository at Runtime**
```bash
GITHUB_REPO_URL=https://github.com/username/repo.git docker-compose up -d coding-agent
```

**Method 3: Start Empty Workspace (No Parameters)**
```bash
docker-compose up -d coding-agent
```

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `GITHUB_TOKEN` | GitHub Personal Access Token | Yes | - |
| `MAX_CONCURRENT_AGENTS` | Max concurrent Coding Agents | No | 3 |
| `NODE_ENV` | Runtime environment | No | development |
| `PORT` | Service port | No | 3000 |

### GitHub Webhook Configuration

Add the following Webhooks in your GitHub repository settings:

- **URL**: `https://your-domain.com/v1/webhooks/issues` (Issues) and `https://your-domain.com/v1/webhooks/pullRequests` (Pull Requests)
- **Content type**: `application/json`
- **Secret**: Set a secure webhook secret for signature verification
- **Events**: 
  - Issues: `Issues` → `Opened`, `Closed`, `Reopened`
  - Pull Requests: `Pull requests` → `Opened`, `Closed`, `Merged`

## Workflow

### 1. Create Task

Create an Issue in the GitHub repository:

```markdown
## Task Description

Implement user authentication including:
- User registration
- User login
- JWT Token generation and validation

## Related Files

- src/routes/auth.ts
- src/middleware/auth.ts
```

### 2. HRA Response

When HRA receives the Issue webhook:

1. Parse Issue content and extract task information
2. Check current running Coding Agent count
3. Create new Coding Agent if below limit
4. Assign task to the Agent

### 3. Coding Agent Execution

Coding Agent (based on OpenCode):

1. Clone repository to working directory
2. Analyze Issue requirements
3. Write/modify code
4. Run tests to ensure quality
5. Commit code and create PR
6. Close working directory

### 4. Human Review

Review the PR:
- Check code quality
- View test results
- Add comments if needed

### 5. Merge PR

After merging the PR:
- HRA receives PR merged webhook
- Destroys the corresponding Coding Agent
- Releases resources

## API Endpoints

- `GET /health` - Health check
- `POST /v1/webhooks/issues` - GitHub Issues webhook
- `POST /v1/webhooks/pullRequests` - GitHub Pull Requests webhook

## Development Guide

For detailed development specifications, see [AGENTS.md](./AGENTS.md), including:

- Code style and naming conventions
- TypeScript configuration
- Testing guidelines
- Commit strategy
- Security rules

## Testing

```bash
# Run all tests
pnpm --filter hra test

# Run tests with coverage
pnpm --filter hra test:coverage

# Run specific test file
pnpm --filter hra test src/routes/webhooks/issues.test.ts

# Watch mode
pnpm --filter hra test -- --watch
```

## License

MIT

## Contributing

Issues and Pull Requests are welcome!

## Contact

For questions, submit an Issue or contact [eeymoo](https://github.com/eeymoo)
