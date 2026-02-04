# Open HR Agent

基于 Express 的 API 项目，支持 @opencode-ai/sdk

## 快速开始

### 自动设置（推荐）

使用 setup 脚本自动配置环境：

**macOS/Linux:**

```bash
./scripts/setup.sh
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
