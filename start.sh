#!/bin/bash

# 启动 HR Agent 项目的所有容器

echo "Starting HR Agent project..."

# 检查网络是否存在
docker network inspect hr-network >/dev/null 2>&1
if [ $? -ne 0 ]; then
  echo "Creating hr-network..."
  docker network create hr-network
fi

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
  --health-interval=10s \
  --health-timeout=5s \
  --health-retries=5 \
  postgres:18-alpine

# 等待 PostgreSQL 健康检查通过
echo "Waiting for PostgreSQL to be ready..."
while [ "$(docker inspect -f '{{.State.Health.Status}}' hr-postgres)" != "healthy" ]; do
  sleep 2
done

# 启动 open-hr-agent
docker run -d \
  --name open-hr-agent \
  --network hr-network \
  -p 3000:3000 \
  -v /var/run/docker.sock:/var/run/docker.sock:rw \
  -e PUID=1000 \
  -e PGID=10 \
  -e PORT=3000 \
  -e DATABASE_URL="postgresql://hr_user:hr_password@hr-postgres:5432/hr_agent_test" \
  -e GITHUB_WEBHOOK_SECRET="test-secret" \
  -e DOCKER_CA_SECRET="test-secret" \
  -e HR_NETWORK="hr-network" \
  --restart unless-stopped \
  --user root \
  open-hr-agent

# 等待 open-hr-agent 启动
echo "Waiting for open-hr-agent to be ready..."
sleep 5

# 启动 hr-agent-web
docker run -d \
  --name hr-agent-web \
  --network hr-network \
  -p 80:80 \
  -e VITE_API_BASE_URL="/api" \
  -e HRA_URL="http://open-hr-agent:3000" \
  --restart unless-stopped \
  hr-agent-web

echo "All containers started successfully!"
echo ""
echo "Access the application at: http://localhost"
echo "API endpoint: http://localhost/api/v1"
echo ""
echo "Check container status: docker ps --filter name=hr-"
echo "View logs: docker logs <container-name>"
