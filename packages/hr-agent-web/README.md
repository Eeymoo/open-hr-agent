# HR Agent Web

基于 React 的 HR Agent 任务管理前端应用。

## 功能特性

- 🔐 基于 SECRET 的身份认证
- 📋 任务编排管理
- 📊 多维度任务查看（看板/表格）
- 🔄 实时任务状态更新（60秒轮询）
- 🎯 RevoGrid 多维表格展示
- 🎨 Ant Design UI 组件
- 💅 Tailwind CSS 样式

## 技术栈

- React 18
- TypeScript
- Vite
- React Router
- Ant Design
- Tailwind CSS
- RevoGrid
- TanStack Query
- Axios

## 开发

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm --filter hr-agent-web dev

# 类型检查
pnpm --filter hr-agent-web typecheck

# 代码检查
pnpm --filter hr-agent-web lint

# 构建
pnpm --filter hr-agent-web build

# 预览构建结果
pnpm --filter hr-agent-web preview
```

## 环境变量

创建 `.env` 文件：

```env
VITE_API_BASE_URL=/api
VITE_POLLING_INTERVAL=60000
```

## 部署

使用 Docker Compose 部署：

```bash
docker-compose up -d hr-agent-web
```

## 项目结构

```
src/
├── api/           # API 接口
├── components/    # 公共组件
├── hooks/         # 自定义 Hooks
├── pages/         # 页面组件
├── routes/        # 路由配置
├── stores/        # 状态管理
├── types/         # 类型定义
└── utils/         # 工具函数
```
