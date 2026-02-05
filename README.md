# Open HR Agent

基于 Express 的 API 项目，支持 @opencode-ai/sdk

## 快速开始

```bash
# NVM 会自动使用 .nvmrc 文件中的版本
nvm use

# 安装 pnpm（如果未安装）
npm install -g pnpm

# 安装依赖
pnpm install

# 启动开发服务器
pnpm run dev
```

**Windows:**

```cmd
scripts\setup.bat
```

### 手动设置

```bash
# 使用 NVM 切换到 Node.js 22
nvm install 22
nvm use 22

# 安装 pnpm（如果未安装）
npm install -g pnpm

# 安装依赖
pnpm install

# 启动开发服务器
pnpm run dev
```

## Docker 部署

### 使用 GitHub Container Registry (ghcr.io)

推荐使用预构建的 Docker 镜像。镜像会在每次推送到 main 分支或打 tag 时自动构建：

```bash
docker pull ghcr.io/eeymoo/open-hr-agent:latest

docker run -d -p 3000:3000 \
  --name open-hr-agent \
  ghcr.io/eeymoo/open-hr-agent:latest
```

### 使用环境变量

```bash
docker run -d -p 3000:3000 \
  --name open-hr-agent \
  -e NODE_ENV=production \
  -e PORT=3000 \
  ghcr.io/eeymoo/open-hr-agent:latest
```

### 使用 Docker Compose

创建 `docker-compose.yml`:

```yaml
version: '3.8'

services:
  open-hr-agent:
    image: ghcr.io/eeymoo/open-hr-agent:latest
    container_name: open-hr-agent
    ports:
      - '3000:3000'
    environment:
      - NODE_ENV=production
      - PORT=3000
    restart: unless-stopped
```

启动服务：

```bash
docker-compose up -d
```

### 本地构建镜像

如果需要本地构建：

```bash
docker build -t open-hr-agent .

docker run -d -p 3000:3000 --name open-hr-agent open-hr-agent
```

## API 端点

- `GET /health` - 健康检查
- `GET /v1/hello` - 示例接口
- `GET /v1/agents` - 获取 Agent 列表
- `GET /v1/error` - 错误示例
- `GET /v1/:id` - 动态路由示例

## 开发

- `pnpm run dev` - 开发模式（支持热重载）
- `pnpm run start` - 生产模式
- `pnpm run build` - 构建 TypeScript
- `pnpm run typecheck` - 类型检查
- `pnpm run lint` - 代码检查
- `pnpm run format` - 代码格式化
- `pnpm run check` - 类型检查 + 代码检查

## 路由规则

项目使用文件系统自动路由，支持 Next.js 风格的路由定义：

```
src/routes/
├── health.ts           → /health
└── v1/
    ├── hello.ts        → /v1/hello
    ├── agents.ts       → /v1/agents
    └── [id]/
        └── index.ts    → /v1/:id (动态路由)
```

## 维护

### 分支清理

定期清理已合并的分支，保持仓库整洁：

```bash
# 手动删除已合并的分支
./scripts/delete-merged-branches.sh

# 或查看文档
cat docs/BRANCH_CLEANUP.md
```

也可以通过 GitHub Actions 自动清理：
1. 前往仓库的 Actions 标签页
2. 选择 "Delete Merged Branches" 工作流
3. 点击 "Run workflow"
