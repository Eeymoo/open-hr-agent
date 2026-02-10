#!/bin/bash

# 停止 HR Agent 项目的所有容器

echo "Stopping HR Agent project..."

docker stop hr-agent-web open-hr-agent hr-postgres 2>/dev/null

echo "All containers stopped."
echo "Remove containers: docker rm hr-agent-web open-hr-agent hr-postgres"
