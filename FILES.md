# open-hr-agent 文件清单

本文档列出 open-hr-agent 项目的主要文件及其用途。

## 根目录

| 文件路径 | 说明 |
|---------|------|
| `AGENTS.md` | Agent 工作指南和项目规范 |
| `README.md` | 项目英文说明文档 |
| `README_zh.md` | 项目中文说明文档 |
| `package.json` | 根 package.json，定义 monorepo 工作空间 |
| `pnpm-workspace.yaml` | pnpm 工作空间配置 |
| `pnpm-lock.yaml` | pnpm 依赖锁定文件 |
| `docker-compose.yml` | Docker Compose 配置 |
| `.env.example` | 环境变量示例 |
| `.gitignore` | Git 忽略文件配置 |
| `.github/workflows/docker-build.yml` | GitHub Actions Docker 构建工作流 |

## `.opencode/` 目录

| 文件路径 | 说明 |
|---------|------|
| `.opencode/.gitignore` | Git 忽略配置 |
| `.opencode/package.json` | OpenCode 工具配置 |
| `.opencode/skills/new-issue/SKILL.md` | 新 Issue 工作流技能 |
| `.opencode/skills/create-pr/SKILL.md` | 创建 PR 工作流技能 |

## `packages/coding-agent/` 目录

Coding Agent (CA) 包，负责具体的编码任务。

| 文件路径 | 说明 |
|---------|------|
| `packages/coding-agent/package.json` | CA 包配置文件 |
| `packages/coding-agent/src/index.ts` | CA 入口文件 |

## `packages/hr-agent/` 目录

HR Agent (HRA) 包，负责 Issue 任务管理和 PR 审核。

### 配置文件

| 文件路径 | 说明 |
|---------|------|
| `packages/hr-agent/package.json` | HRA 包配置文件 |
| `packages/hr-agent/tsconfig.json` | TypeScript 配置 |
| `packages/hr-agent/vitest.config.ts` | Vitest 测试配置 |
| `packages/hr-agent/eslint.config.js` | ESLint 配置 |
| `packages/hr-agent/nodemon.json` | Nodemon 配置 |
 | `packages/hr-agent/.env` | 环境变量文件（本地） |
 | `packages/hr-agent/.env.example` | 环境变量示例（含 HRA_CA_NAME_PREFIX） |
 | `packages/hr-agent/docker-compose.yml` | HRA Docker 配置 |

### 源代码

| 文件路径 | 说明 |
|---------|------|
| `packages/hr-agent/src/index.ts` | HRA 应用入口，Express app 设置 |

### 配置 (`src/config/`)

| 文件路径 | 说明 |
|---------|------|
| `packages/hr-agent/src/config/docker.ts` | Docker 配置常量（含 NAME_PREFIX） |
| `packages/hr-agent/src/config/taskStatus.ts` | 任务状态常量 |

### 中间件 (`src/middleware/`)

| 文件路径 | 说明 |
|---------|------|
| `packages/hr-agent/src/middleware/autoLoadRoutes.ts` | 自动加载路由中间件 |
| `packages/hr-agent/src/middleware/autoLoadRoutes.test.ts` | 自动加载路由测试 |
| `packages/hr-agent/src/middleware/caProxy.ts` | CA 代理中间件 |
| `packages/hr-agent/src/middleware/responseFormat/toonMiddleware.ts` | Toon 格式响应中间件 |

### 路由 (`src/routes/`)

| 文件路径 | 说明 |
|---------|------|
| `packages/hr-agent/src/routes/health.ts` | 健康检查路由 |
| `packages/hr-agent/src/routes.test.ts` | 路由集成测试 |

#### API v1 路由 (`src/routes/v1/`)

| 文件路径 | 说明 |
|---------|------|
| `packages/hr-agent/src/routes/v1/ca/add.post.ts` | 创建 CA 容器 |
| `packages/hr-agent/src/routes/v1/ca/index.get.ts` | 获取 CA 列表 |
| `packages/hr-agent/src/routes/v1/ca/[name].get.ts` | 获取单个 CA 信息 |
| `packages/hr-agent/src/routes/v1/ca/[name].put.ts` | 更新 CA 容器 |
| `packages/hr-agent/src/routes/v1/ca/[name].delete.ts` | 删除 CA 容器 |
| `packages/hr-agent/src/routes/v1/cas/index.get.ts` | 获取所有 CA（分页） |
| `packages/hr-agent/src/routes/v1/cas/[id]/index.get.ts` | 获取单个 CA 详情 |
| `packages/hr-agent/src/routes/v1/cas/[id]/index.put.ts` | 更新 CA 状态 |
| `packages/hr-agent/src/routes/v1/cas/[id]/index.delete.ts` | 删除 CA 记录 |
| `packages/hr-agent/src/routes/v1/issues/index.get.ts` | 获取 Issues 列表 |
| `packages/hr-agent/src/routes/v1/issues/index.post.ts` | 创建 Issue |
| `packages/hr-agent/src/routes/v1/issues/[id].get.ts` | 获取单个 Issue |
| `packages/hr-agent/src/routes/v1/issues/[id].put.ts` | 更新 Issue |
| `packages/hr-agent/src/routes/v1/issues/[id].delete.ts` | 删除 Issue |
| `packages/hr-agent/src/routes/v1/prs/index.get.ts` | 获取 PRs 列表 |
| `packages/hr-agent/src/routes/v1/prs/index.post.ts` | 创建 PR |
| `packages/hr-agent/src/routes/v1/prs/[id].get.ts` | 获取单个 PR |
| `packages/hr-agent/src/routes/v1/prs/[id].put.ts` | 更新 PR |
| `packages/hr-agent/src/routes/v1/prs/[id].delete.ts` | 删除 PR |
| `packages/hr-agent/src/routes/v1/tasks/index.get.ts` | 获取 Tasks 列表 |
| `packages/hr-agent/src/routes/v1/tasks/index.post.ts` | 创建 Task |
| `packages/hr-agent/src/routes/v1/tasks/[id]/index.get.ts` | 获取单个 Task |
| `packages/hr-agent/src/routes/v1/tasks/[id]/index.put.ts` | 更新 Task |
| `packages/hr-agent/src/routes/v1/tasks/[id]/index.delete.ts` | 删除 Task |
| `packages/hr-agent/src/routes/v1/tasks/[id]/status.put.ts` | 更新 Task 状态 |
| `packages/hr-agent/src/routes/v1/tasks/[id]/assign.post.ts` | 分配 Task |
| `packages/hr-agent/src/routes/v1/webhooks/issues.post.ts` | GitHub Issues Webhook |
| `packages/hr-agent/src/routes/v1/webhooks/pullRequests.post.ts` | GitHub PRs Webhook |

### 工具函数 (`src/utils/`)

| 文件路径 | 说明 |
|---------|------|
| `packages/hr-agent/src/utils/Result.ts` | Result 响应类 |
| `packages/hr-agent/src/utils/Result.test.ts` | Result 测试 |
| `packages/hr-agent/src/utils/database.ts` | 数据库工具函数 |
| `packages/hr-agent/src/utils/database.test.ts` | 数据库测试 |
| `packages/hr-agent/src/utils/secretManager.ts` | 密钥管理工具 |
| `packages/hr-agent/src/utils/secretManager.test.ts` | 密钥管理测试 |
| `packages/hr-agent/src/utils/webhook.ts` | Webhook 工具函数 |
| `packages/hr-agent/src/utils/webhook.test.ts` | Webhook 测试 |
| `packages/hr-agent/src/utils/webhookHandler.ts` | Webhook 处理器 |

#### Docker 工具 (`src/utils/docker/`)

| 文件路径 | 说明 |
|---------|------|
| `packages/hr-agent/src/utils/docker/index.ts` | Docker 工具入口 |
| `packages/hr-agent/src/utils/docker/createContainer.ts` | 创建容器 |
| `packages/hr-agent/src/utils/docker/deleteContainer.ts` | 删除容器 |
| `packages/hr-agent/src/utils/docker/getContainer.ts` | 获取容器信息 |
| `packages/hr-agent/src/utils/docker/listContainers.ts` | 列出容器 |
| `packages/hr-agent/src/utils/docker/updateContainer.ts` | 更新容器 |

### 数据库

| 文件路径 | 说明 |
|---------|------|
| `packages/hr-agent/prisma/schema.prisma` | Prisma 数据库模型定义 |

## 统计信息

- **包数量**: 2 (hr-agent, coding-agent)
 - **源代码文件**: 52+
 - **测试文件**: 6
- **路由数量**: 25+
 - **中间件**: 4
- **工具函数**: 10+
