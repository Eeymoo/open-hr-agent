# Scripts 目录

本目录包含项目的所有 shell 脚本。

## 目录结构

```
scripts/
└── test/          # 测试脚本
    ├── test-task-manager.sh    # 任务管理器测试脚本
    └── test-ca-api.sh          # CA API 测试脚本
```

## 测试脚本

### test-task-manager.sh

任务管理系统的集成测试脚本。

**功能：**
- 创建测试 GitHub Issue
- 监控任务执行状态
- 查看 CA 容器状态
- 显示任务日志和 PR 状态

**使用方法：**

```bash
# 从项目根目录运行
./scripts/test/test-task-manager.sh

# 或切换到测试目录运行
cd scripts/test
./test-task-manager.sh
```

**前提条件：**
- 已安装 GitHub CLI (gh)
- 本地 HRA 服务正在运行 (`pnpm --filter hra dev`)
- GitHub Token 已配置

**环境变量：**
- `API_URL` - HRA API 地址（默认：http://rha.onemue.cn/v1）

### test-ca-api.sh

CA 容器管理 API 的测试工具。

**功能：**
- 创建 CA 容器
- 查询容器列表和详情
- 更新容器状态（重启）
- 删除容器
- 错误处理测试

**使用方法：**

```bash
# 从项目根目录运行（使用默认配置）
./scripts/test/test-ca-api.sh

# 指定自定义配置
DOCKER_CA_SECRET=your_secret API_BASE=https://your-api.com ./scripts/test/test-ca-api.sh
```

**环境变量：**
- `DOCKER_CA_SECRET` - CA 密钥（默认：PTr5Umbf0BMirteZ1GhTWnf8O8Po64O0）
- `API_BASE` - API 基础 URL（默认：https://rha.onemue.cn）
- `CONTAINER_NAME` - 测试容器名称（默认：test-agent-001）

## 包级脚本

每个包都有自己的 `scripts/` 目录，用于存放该包特定的脚本：

- `packages/hr-agent/scripts/` - HRA 包的脚本
- `packages/coding-agent/scripts/` - Coding Agent 包的脚本
