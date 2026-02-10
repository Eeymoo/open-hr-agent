# HR Agent 项目部署指南

## 项目概述

本项目成功拉取了 [open-hr-agent](https://github.com/Eeymoo/open-hr-agent) 项目，并使用 Docker 进行部署。项目包含以下服务：

- **hr-postgres**: PostgreSQL 数据库（端口 5432）
- **open-hr-agent**: 后端服务（端口 3000）
- **hr-agent-web**: Web 前端界面（端口 80）

## 部署步骤

### 1. 构建镜像

```bash
cd hra

# 构建 open-hr-agent 镜像
docker build -f packages/hr-agent/Dockerfile -t open-hr-agent .

# 构建 hr-agent-web 镜像
docker build -f packages/hr-agent-web/Dockerfile -t hr-agent-web .
```

### 2. 启动服务

使用提供的启动脚本：

```bash
./start.sh
```

或者手动启动：

```bash
# 创建网络（如果不存在）
docker network create hr-network

# 启动 PostgreSQL
docker run -d \
  --name hr-postgres \
  --network hr-network \
  -e POSTGRES_DB=hr_agent_test \
  -e POSTGRES_USER=hr_user \
  -e POSTGRES_PASSWORD=hr_password \
  -p 5432:5432 \
  -v hr_postgres_data:/var/lib/postgresql/data \
  --restart unless-stopped \
  --health-cmd="pg_isready -U hr_user -d hr_agent_test" \
  postgres:18-alpine

# 等待 PostgreSQL 健康检查通过
while [ "$(docker inspect -f '{{.State.Health.Status}}' hr-postgres)" != "healthy" ]; do
  sleep 2
done

# 启动 open-hr-agent
docker run -d \
  --name open-hr-agent \
  --network hr-network \
  -p 3000:3000 \
  -v /var/run/docker.sock:/var/run/docker.sock:rw \
  -e DATABASE_URL="postgresql://hr_user:hr_password@hr-postgres:5432/hr_agent_test" \
  -e GITHUB_WEBHOOK_SECRET="test-secret" \
  -e DOCKER_CA_SECRET="test-secret" \
  -e HR_NETWORK="hr-network" \
  --restart unless-stopped \
  --user root \
  open-hr-agent

# 启动 hr-agent-web
docker run -d \
  --name hr-agent-web \
  --network hr-network \
  -p 80:80 \
  -e VITE_API_BASE_URL="/api" \
  -e HRA_URL="http://open-hr-agent:3000" \
  --restart unless-stopped \
  hr-agent-web
```

### 3. 停止服务

```bash
./stop.sh
```

或手动停止：

```bash
docker stop hr-agent-web open-hr-agent hr-postgres
```

## 访问服务

- **Web 界面**: http://localhost
- **API 端点**: http://localhost/api/v1
- **直接后端**: http://localhost:3000

## 常用命令

### 查看容器状态

```bash
docker ps --filter "name=hr-"
```

### 查看日志

```bash
# 查看所有日志
docker logs open-hr-agent
docker logs hr-agent-web
docker logs hr-postgres

# 查看实时日志
docker logs -f open-hr-agent
```

### 进入容器

```bash
docker exec -it open-hr-agent sh
docker exec -it hr-agent-web sh
```

### 测试 API

```bash
# 获取任务列表
curl http://localhost/api/v1/tasks/index | jq .

# 获取健康状态
curl http://localhost:3000/health | jq .
```

## 环境变量配置

主要环境变量在 `.env` 文件中配置：

- `DATABASE_URL`: PostgreSQL 数据库连接字符串
- `GITHUB_TOKEN`: GitHub API token
- `GITHUB_REPO_URL`: GitHub 仓库 URL
- `GITHUB_WEBHOOK_SECRET`: GitHub webhook 密钥
- `DOCKER_CA_SECRET`: Docker CA 密钥

## 问题排查

### 容器无法启动

1. 检查容器日志：`docker logs <container-name>`
2. 检查网络：`docker network ls` 和 `docker network inspect hr-network`
3. 检查端口占用：`lsof -i :3000` 或 `lsof -i :80`

### API 无法访问

1. 检查 open-hr-agent 健康状态：`curl http://localhost:3000/health`
2. 检查 nginx 配置：`docker exec hr-agent-web cat /etc/nginx/nginx.conf`
3. 检查后端日志：`docker logs open-hr-agent`

### 数据库连接失败

1. 检查 PostgreSQL 容器状态：`docker inspect hr-postgres --format '{{.State.Health.Status}}'`
2. 检查数据库连接：`docker exec hr-postgres pg_isready -U hr_user -d hr_agent_test`
3. 查看数据库日志：`docker logs hr-postgres`

## 项目结构

```
hra/
├── packages/
│   ├── hr-agent/          # 后端服务
│   │   ├── Dockerfile
│   │   └── src/
│   ├── hr-agent-web/      # 前端服务
│   │   ├── Dockerfile
│   │   ├── nginx.conf
│   │   └── src/
│   └── coding-agent/      # 编码代理
│       └── Dockerfile
├── docker-compose.yml     # Docker Compose 配置（未使用）
├── .env                   # 环境变量
├── start.sh              # 启动脚本
└── stop.sh               # 停止脚本
```

## 注意事项

1. **DNS 问题**: 由于 Docker 网络的 DNS 解析问题，open-hr-agent 使用了 PostgreSQL 容器的 IP 地址而不是主机名。
2. **API 代理**: 前端 nginx 配置将 `/api/v1` 路径代理到后端 `/v1` 路径。
3. **权限**: open-hr-agent 容器需要以 root 用户运行，以便访问 Docker socket。
4. **端口冲突**: 确保 80、3000、5432 端口没有被其他服务占用。

## 下一步

1. 配置 GitHub 相关的环境变量
2. 设置 GitHub Webhooks
3. 创建第一个 Issue 或 Pull Request 来测试系统
4. 配置编码代理（coding-agent）以支持自动代码生成

## 参考文档

- [项目 README](README_zh.md)
- [AGENTS.md](AGENTS.md)
- [GitHub 仓库](https://github.com/Eeymoo/open-hr-agent)
