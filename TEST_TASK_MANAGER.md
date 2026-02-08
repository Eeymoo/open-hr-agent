# 事件驱动任务管理系统测试指南

## 前置条件

1. **安装 gh CLI**
   ```bash
   # macOS
   brew install gh
   
   # Linux
   # 参考: https://github.com/cli/cli
   ```

2. **启动本地服务**
   ```bash
   cd /home/eymoo/Codes/open-hr-agent
   pnpm --filter hra dev
   ```

3. **验证服务运行**
   ```bash
   curl http://localhost:3000/api/v1/health
   # 应该返回: {"success": true, "data": {"status": "healthy"}}
   ```

## 测试步骤

### 1. 运行测试脚本

```bash
cd /home/eymmoo/Codes/open-hr-agent
./test-task-manager.sh
```

### 2. 手动创建 Issue（可选）

```bash
gh issue create \
  --title "[测试] 事件驱动任务管理系统" \
  --body "测试事件驱动任务管理系统的完整任务链" \
  --label "hra" \
  --repo Eeymoo/open-hr-agent
```

### 3. 手动执行任务（可选）

```bash
# 执行 create_ca 任务
curl -X POST http://localhost:3000/api/v1/tasks/execute \
  -H "Content-Type: application/json" \
  -d '{
    "taskName": "create_ca",
    "params": {
      "issueNumber": 123
    },
    "priority": 50
  }'

# 查看任务列表
curl http://localhost:3000/api/v1/tasks

# 查看调度器状态
curl http://localhost:3000/api/v1/tasks/scheduler-status
```

### 4. 查看 CA 容器

```bash
# 查看所有 CA 容器
docker ps -a | grep 'hra_'

# 查看特定容器日志
docker logs hra_123

# 查看容器健康状态
docker inspect hra_123 | jq '.[0].State.Health.Status'
```

### 5. 查看任务日志

```bash
# 查看今天所有任务日志
ls -lt ./logs/tasks/*.log

# 查看特定任务的日志
tail -f ./logs/tasks/$(date +%Y-%m-%d)_task_<TASK_ID>.log

# 实时监控日志
tail -f ./logs/tasks/*.log
```

### 6. 检查数据库（可选）

```bash
# 进入 PostgreSQL 容器
docker exec -it postgres psql -U postgres

# 查询任务表
SELECT id, type, status, priority, "createdAt", "updatedAt"
FROM "Task"
ORDER BY "createdAt" DESC
LIMIT 10;

# 查询 CA 表
SELECT id, "caName", status, containerId
FROM "CodingAgent"
WHERE status != 'destroyed'
ORDER BY "createdAt" DESC;
```

## 预期行为

### 任务链流程

1. **Issue 创建** → 触发 webhook
2. **create_ca** - 创建 Docker 容器 `hra_<issue_number>`
3. **connect_ca** - 连接到容器并发送身份消息
4. **ai_coding** - 通过 OpenCode SDK 发送编码任务
5. **create_pr** - 创建 GitHub PR
6. **destroy_ca** - 销毁 CA 容器

### 事件顺序

```
TASK_QUEUED
  ↓
TASK_STARTED
  ↓
TASK_COMPLETED
  ↓
下一个任务 TASK_QUEUED
  ↓
...
```

### 错误处理

如果任务失败，TaskManager 会在 Issue 上创建评论，包含：
- 任务 ID
- 任务名称
- 错误信息
- 重试次数

### 优先级系统

Issue labels 决定任务优先级（0-100）：
- `critical`: 100
- `high`: 80
- `medium-high`: 60
- `medium`: 50 (默认)
- `medium-low`: 40
- `low`: 30
- `very-low`: 20
- `minimal`: 10

### 重试机制

- 第1 次重试：10 秒后
- 第 2 次重试：20 秒后
- 第 3 次重试：40 秒后
- 第 4-5 次重试：40 秒后
- 超过 5 次后标记为失败

### CA 资源池

- 最大并发数：3
- 智能分配策略：
  - 1. 优先使用空闲 CA
  2. 2. 如果没有空闲且总数 < 3，创建新 CA
  3. 3. 如果总数 = 3，等待 CA 释放

## 监控命令

### 实时监控

```bash
# 终端 1：监控任务日志
tail -f ./logs/tasks/*.log

# 终端 2：监控调度器状态
watch -n 1 "curl -s http://localhost:3000/api/v1/tasks/scheduler-status | jq ."

# 终端 3：监控任务列表
watch -n 1 "curl -s http://localhost:3000/api/v1/tasks | jq '.[] | {id: .id, type: .type, status: .status}'"
```

### 检查命令

```bash
# 查看所有 CA
curl http://localhost:3000/api/v1/cas

# 查看特定 CA
curl http://localhost:3000/api/v1/cas/<id>

# 查看所有任务
curl http://localhost:3000/api/v1/tasks

# 查看特定任务
curl http://localhost:3000/api/v1/tasks/<id>

# 更新任务状态
curl -X PUT http://localhost:3000/api/v1/tasks/<id>/status \
  -H "Content-Type: application/json" \
  -d '{"status": "completed"}'

# 手动创建 PR（测试）
curl -X POST http://localhost:3000/api/v1/prs \
  -H "Content-Type: application/json" \
  -d '{
    "issueId": <issue_id>,
    "prTitle": "Test PR",
    "prContent": "Test PR content"
  }'
```

## 故障排查

### 问题 1: TaskManager 未初始化

**症状**: 错误日志显示 "TaskManager not initialized"

**解决**:
```bash
# 检查服务日志
tail -f packages/hr-agent/dist/index.js

# 重启服务
Ctrl+C
pnpm --filter hra dev
```

### 问题 2: CA 容器创建失败

**症状**: create_ca 任务失败

**解决**:
```bash
# 检查 Docker 状态
docker ps -a | grep 'hra_'

# 检查 Docker 日志
docker logs <container_id>

# 检查 Docker 配置
cat .env | grep DOCKER_

# 手动测试容器创建
pnpm --filter hra dev
# 在另一个终端:
curl -X POST http://localhost:3000/api/v1/ca/add \
  -H "Content-Type: application/json" \
  -d '{
    "issueId": 123
  }'
```

### 问题 3: CA 连接失败

**症状**: connect_ca 任务失败

**解决**:
```bash
# 检查容器是否运行
docker ps -a | grep 'hra_'

# 检查容器端口
docker port <container_id>

# 测试容器可达性
curl http://localhost:4096/health

# 检查容器日志
docker logs -f <container_id>
```

### 问题 4: 事件未触发

**症状**: Issue 创建后无任务执行

**解决**:
```bash
# 检查 webhook 日志
tail -f packages/hr-agent/dist/index.js | grep 'webhook'

# 验证 webhook 配置
# 检查 GitHub 仓库设置 → Webhooks → HRA agent
# 验证 secret 配置: cat .env | grep GITHUB_WEBHOOK_SECRET

# 查看 webhook 日志
docker logs <github_webhook_container>
```

### 问题 5: 数据库连接问题

**症状**: 创建 Issue/CA/PR 失败

**解决**:
```bash
# 检查数据库容器
docker ps | grep postgres

# 检查数据库连接
cat .env | grep DATABASE_URL

# 测试数据库连接
docker exec -it postgres psql -U postgres -c "SELECT version();"
```

## 清理测试数据

```bash
# 停止测试 Issue
gh issue close <issue_number> --repo Eeymoo/open-hr-agent \
  --comment "测试完成"

# 清理 CA 容器
docker ps -a | grep 'hra_' | awk '{print $1}' | xargs docker stop

# 清理 CA 数据库记录
# 需要手动删除或使用 psql

# 清理任务日志
rm -rf ./logs/tasks/*
```

## 性能测试

```bash
# 并发测试：创建多个 Issue
for i in {1..5}; do
  gh issue create \
    --title "[并发测试 $i] $(date +%s)" \
    --body "测试并发任务处理能力" \
    --label "hra" \
    --repo Eeymoo/open-hr-agent
    sleep 5
done

# 监控调度器状态和 CA 使用情况
watch -n 1 "curl -s http://localhost:3000/api/v1/tasks/scheduler-status | jq ."
```

## 高级测试

### 测试重试机制

```bash
# 手动触发失败任务（模拟网络错误）
# 1. 停止本地服务
pnpm --filter hra dev
# Ctrl+C

# 2. 创建 Issue
gh issue create \
  --title "[重试测试]" \
  --body "测试任务重试机制" \
  --label "hra" \
  --repo Eeymoo/open-hr-agent

# 3. 启动服务（模拟网络恢复）
pnpm --filter hra dev

# 4. 观察重试次数和延迟
```

### 测试 CA 资源限制

```bash
# 创建 4 个 Issue（超过 CA 限制）
for i in {1..4}; do
  gh issue create \
    --title "[CA 限制测试 $i] $(date +%s)" \
    --body "测试 3 个 CA 并发限制" \
    --label "hra" \
      --repo Eeymoo/open-hr-agent
    sleep 2
done

# 观察任务队列和 CA 分配
```

### 测试优先级系统

```bash
# 高优先级任务
gh issue create \
  --title "[高优先级] 优先级 80" \
  --body "测试高优先级任务优先处理" \
  --label "hra" \
  --label "high" \
  --repo Eeymoo/open-hr-agent

# 低优先级任务
gh issue create \
  --title "[低优先级] 优先级 20" \
  --body "测试低优先级任务延迟处理" \
  --label "hra" \
  --label "very-low" \
  --repo Eeyoom/open-hr-agent

# 观察任务执行顺序
```

## 集成测试清单

- [ ] Issue 创建触发 webhook
- [ ] create_ca 创建容器成功
- [ ] connect_ca 连接成功
- [ ] ai_coding 发送任务成功
- [ ] create_pr 创建 PR 成功
- [ ] destroy_ca 销毁容器成功
- [ ] 优先级系统正常工作
- [ ] 重试机制正常工作
- [ ] CA 资源池正常工作（最多 3 个并发）
- [ ] 错误处理正常工作（Issue 评论）
- [ ] 日志记录正常
- [ ] API 端点正常工作

## 成功标志

测试成功的标志：

1. ✅ Issue 创建后自动开始任务链
2. ✅ 任务按预期顺序执行
3. ✅ CA 容器正确创建和销毁
4. ✅ 任务日志正确记录
5. ✅ 错误时在 Issue 上创建评论
6. ✅ 优先级任务优先执行
7. ✅ 重试机制按预期延迟工作
8. ✅ 并发任务正确调度
9. ✅ CA 资源池正确限制（最多 3 个）
