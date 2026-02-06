# Open HR Agent (HRA)

基于 GitHub 的 AI 自编排任务管理工具，。使用 Issue 创建任务，通过 AI Coding Agent 实现自动编码，使用 PR 合并代码。

## 核心理念

HRA 旨在构建一个自我完善的 AI Agent 系统。其核心运作模式如下：

1. **任务创建**: 通过 GitHub Issue 创建任务
2. **员工招募**: 发现 Issue 时，HRA 自动创建（招募）Coding Agent（员工）
3. **任务执行**: Coding Agent 完成编码任务并提交 PR
4. **人工审查**: 人工审核并合并 PR（此步骤后续也可自动化）
5. **员工销毁**: PR 合并后，HRA 自动销毁该 Coding Agent

### 为什么这样设计？

- **降低成本**: HRA 不是 24 小时运转的，只在有任务时才启动 Coding Agent
- **按需分配**: 可以根据配置管理最大数量的 Coding Agent，实现并行处理
- **Git 原生**: 完全基于 GitHub/Git 工作流，无需额外的基础设施
- **可扩展**: Coding Agent 可替换（当前使用 OpenCode，后续可调整为其他方案）

## 架构说明

```
┌─────────────────────────────────────────────────────────────┐
│                      GitHub Repository                        │
│  ┌──────────┐                                               │
│  │  Issues  │ ────► 触发 HRA 创建 Coding Agent              │
│  └──────────┘                                               │
│  ┌──────────┐                                               │
│  │   Pull   │ ────► PR 合并后触发 HRA 销毁 Coding Agent     │
│  │ Requests │       人工审查代码质量                         │
│  └──────────┘                                               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    HRA (HR Agent)                            │
│  - 监听 GitHub Webhooks (Issues, PRs)                        │
│  - 管理 Coding Agent 的生命周期 (创建/销毁)                   │
│  - 配置最大并发 Agent 数量                                    │
│  - 任务队列管理                                               │
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
│                    提交代码到 GitHub                          │
└─────────────────────────────────────────────────────────────┘
```

## Monorepo 结构

这是一个使用 pnpm workspace 管理的 Monorepo：

```
open-hr-agent/
├── packages/
│   ├── hra/              # HR Agent - 任务管理和 Agent 生命周期管理
│   │   ├── src/
│   │   │   ├── routes/   # API 路由
│   │   │   │   └── v1/
│   │   │   │       └── webhooks/
│   │   │   │           ├── issues.ts      # Issue webhook 处理
│   │   │   │           └── pullRequests.ts # PR webhook 处理
│   │   │   ├── middleware/
│   │   │     │   └── autoLoadRoutes.ts      # 自动路由加载
│   │   │   └── utils/
│   │   └── vitest.config.ts
│   │
│   └── coding-agent/     # Coding Agent (CA) - 具体编码任务的执行
│       └── src/
│
├── package.json          # Workspace 配置
├── AGENTS.md             # Agent 开发指南
└── README.md
```

## 快速开始

### 环境要求

- Node.js >= 22.0.0
- pnpm >= 9.0.0
- Docker (可选，用于管理 Coding Agent)

### 本地开发

```bash
# 使用 NVM 切换到 Node.js 22
nvm use

# 安装依赖
pnpm install

# 启动 HRA 开发服务器
pnpm --filter hra dev
```

### 主要命令

```bash
# 安装所有依赖
pnpm install

# 构建所有包
pnpm run build

# 类型检查
pnpm run typecheck

# 代码检查
pnpm run lint

# 代码格式化
pnpm run format

# 运行测试
pnpm --filter hra test

# 完整检查（类型检查 + 代码检查）
pnpm run check
```

## 部署

### Docker 部署（推荐）

#### 使用 GitHub Container Registry

```bash
# 拉取最新镜像
docker pull ghcr.io/eeymoo/open-hr-agent:latest

# 运行容器
docker run -d -p 3000:3000 \
  --name open-hr-agent \
  -e GITHUB_TOKEN=your_github_token \
  -e MAX_CONCURRENT_AGENTS=3 \
  ghcr.io/eeymoo/open-hr-agent:latest
```

#### 使用 Docker Compose

创建 `docker-compose.yml`:

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

启动服务：

```bash
docker-compose up -d
```

#### Coding Agent 部署方式

Coding Agent 支持三种部署方式：

**方式一：挂载本地代码目录**
```bash
CODE_PATH=/path/to/your/repo docker-compose up -d coding-agent
```

**方式二：运行时克隆 GitHub 仓库**
```bash
GITHUB_REPO_URL=https://github.com/username/repo.git docker-compose up -d coding-agent
```

**方式三：启动空 workspace（不指定任何参数）**
```bash
docker-compose up -d coding-agent
```

#### 使用 Docker Compose

创建 `docker-compose.yml`:

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
```

启动服务：

：

```bash
docker-compose up -d
```

### 环境变量配置

| 变量名 | 说明 | 必需 | 默认值 |
|--------|------|------|--------|
| `GITHUB_TOKEN` | GitHub Personal Access Token | 是 | - |
| `MAX_CONCURRENT_AGENTS` | 最大并发 Coding Agent 数量 | 否 | 3 |
| `NODE_ENV` | 运行环境 | 否 | development |
| `PORT` | 服务端口 | 否 | 3000 |

### GitHub Webhook 配置

在你的 GitHub 仓库设置中添加以下 Webhook：

- **URL**: `https://your-domain.com/v1/webhooks/issues` (Issues) 和 `https://your-domain.com/v1/webhooks/pullRequests` (Pull Requests)
- **Content type**: `application/json`
- **Secret**: 设置一个安全的 webhook secret 用于签名验证
- **Events**: 
  - Issues: `Issues` → `Opened`, `Closed`, `Reopened`
  - Pull Requests: `Pull requests` → `Opened`, `Closed`, `Merged`

## 工作流程

### 1. 创建任务

在 GitHub 仓库中创建一个 Issue：

```markdown
## 任务描述

请实现用户认证功能，包括：
- 用户注册
- 用户登录
- JWT Token 生成和验证

## 相关文件

- src/routes/auth.ts
- src/middleware/auth.ts
```

### 2. HRA 响应

HRA 收到 Issue webhook 后：

1. 解析 Issue 内容，提取任务信息
2. 检查当前运行中的 Coding Agent 数量
3. 如果未达到上限，创建新的 Coding Agent
4. 将任务分配给该 Agent

### 3. Coding Agent 执行

Coding Agent（基于 OpenCode）：

1. 克隆仓库到工作目录
2. 分析 Issue 需求
3. 编写/修改代码
4. 运行测试确保质量
5. 提交代码并创建 PR
6. 关闭工作目录

### 4. 人工审查

审查 PR：
- 检查代码质量
- 查看测试结果
- 根据需要添加评论

### 5. 合并 PR

合并 PR 后：
- HRA 收到 PR merged webhook
- 销毁对应的 Coding Agent
- 释放资源

## API 端点

- `GET /health` - 健康检查
- `POST /v1/webhooks/issues` - GitHub Issues webhook
- `POST /v1/webhooks/pullRequests` - GitHub Pull Requests webhook

## 开发指南

详细的开发规范请查看 [AGENTS.md](./AGENTS.md)，包含：

- 代码风格和命名规范
- TypeScript 配置
- 测试指南
- 提交策略
- 安全规则

## 测试

```bash
# 运行所有测试
pnpm --filter hra test

# 运行测试并生成覆盖率报告
pnpm --filter hra test:coverage

# 运行特定测试文件
pnpm --filter hra test src/routes/webhooks/issues.test.ts

# 监听模式运行测试
pnpm --filter hra test -- --watch
```

## License

MIT

## Contributing

欢迎提交 Issue 和 Pull Request！

## 联系方式

如有问题，请提交 Issue 或联系 [eeymoo](https://github.com/eeymoo)
