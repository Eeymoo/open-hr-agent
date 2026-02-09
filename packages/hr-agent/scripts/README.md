# HRA Scripts 目录

本目录包含 HRA (HR Agent) 包的 shell 脚本。

## 脚本列表

- `docker-entrypoint.sh` - Docker 容器的入口脚本，用于启动 HRA 服务

## docker-entrypoint.sh

Docker 容器的启动入口脚本，负责：
- 初始化数据库连接
- 启动 Express 服务
- 配置环境变量

**注意：** 此脚本由 Dockerfile 调用，不应直接运行。
