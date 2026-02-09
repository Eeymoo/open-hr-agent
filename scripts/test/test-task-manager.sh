#!/bin/bash

set -e

# 获取脚本所在目录并返回项目根目录
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "${SCRIPT_DIR}/../.."

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m0m' # No Color

# 配置
REPO="Eeymoo/open-hr-agent"
GITHUB_URL="https://github.com/${REPO}"
API_URL="http://rha.onemue.cn/v1"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE} 事件驱动任务管理系统测试脚本${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 检查 gh 是否安装
if ! command -v gh &> /dev/null; then
    echo -e "${RED}错误: gh CLI 未安装${NC}"
    echo "请安装: https://cli.github.com/"
    exit 1
fi

echo -e "${GREEN}✓ gh CLI 已安装${NC}"
echo ""

# 检查本地服务是否运行
echo -e "${YELLOW}检查本地服务...${NC}"
if curl -s "${API_URL}/health" > /dev/null; then
    echo -e "${GREEN}✓ 本地服务运行中${NC}"
else
    echo -e "${RED}✗ 本地服务未运行${NC}"
    echo "请先启动服务: pnpm --filter hra dev"
    exit 1
fi
echo ""

# 获取调度器状态
echo -e "${BLUE}获取调度器状态...${NC}"
SCHEDULER_STATUS=$(curl -s "${API_URL}/tasks/scheduler-status" || echo '{}')
echo -e "调度器状态: ${SCHEDULER_STATUS}"
echo ""

# 创建测试 Issue
echo -e "${BLUE}创建测试 Issue...${NC}"
ISSUE_TITLE="[测试] 事件驱动任务管理系统 $(date '+%Y-%m-%d %H:%M:%S')"
ISSUE_BODY="这是一个测试 Issue，用于验证事件驱动任务管理系统的功能

任务链：
1. create_ca - 创建 CA 容器
2. connect_ca - 连接到 CA
3. ai_coding - AI 编码任务
4. create_pr - 创建 PR
5. destroy_ca - 销毁 CA 容器

测试时间: $(date)"

ISSUE_URL=$(gh issue create \
  --title "${ISSUE_TITLE}" \
  --body "${ISSUE_BODY}" \
  --label "hra" \
  --repo "${REPO}" || echo "")

ISSUE_NUMBER=$(echo "$ISSUE_URL" | grep -oE '[0-9]+$' || echo "")

if [ -z "$ISSUE_NUMBER" ]; then
    echo -e "${RED}✗ Issue 创建失败${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Issue 创建成功${NC}"
echo -e "  Issue URL: ${ISSUE_URL}"
echo -e "  Issue Number: ${ISSUE_NUMBER}"
echo ""

# 等待并监控任务执行
echo -e "${BLUE}开始监控任务执行...${NC}"
echo -e "${YELLOW}（30 秒检查周期，按 Ctrl+C 停止）${NC}"
echo ""

# 检查间隔（秒）
CHECK_INTERVAL=5
MAX_CHECKS=120  # 最多检查 10 分钟 (120 * 5秒)

for i in $(seq 1 $MAX_CHECKS); do
    echo -e "${YELLOW}[$i/$MAX_CHECKS] 检查任务状态...${NC}"
    
    # 获取任务状态
    TASKS=$(curl -s "${API_URL}/tasks" || echo '[]')

    # 解析任务数量
    TASK_COUNT=$(echo "$TASKS" | jq -r '.data | length // 0' 2>/dev/null || echo "0")
    
    if [ "$TASK_COUNT" -gt 0 ]; then
        echo -e "${GREEN}  发现 $TASK_COUNT 个任务${NC}"
        
        # 显示前 3 个任务的详细信息
        echo "$TASKS" | jq -r '.data[:3] | {
            id: .id,
            type: .type,
            status: .status,
            priority: .priority,
            issueId: .issueId.issueId
        }' 2>/dev/null || echo "$TASKS"
    fi
    
    # 获取调度器状态
    SCHEDULER_STATUS=$(curl -s "${API_URL}/tasks/scheduler-status" || echo '{}')
    
    # 解析 CA 状态
    CA_TOTAL=$(echo "$SCHEDULER_STATUS" | jq -r '.data.caPool.total // empty' 2>/dev/null || echo "0")
    CA_IDLE=$(echo "$SCHEDULER_STATUS" | jq -r '.data.caPool.idle // empty' 2>/dev/null || echo "0")
    CA_BUSY=$(echo "$SCHEDULER_STATUS" | jq -r '.data.caPool.busy // empty' 2>/dev/null || echo "0")
    CA_CREATING=$(echo "$SCHEDULER_STATUS" | jq -r '.data.caPool.creating // empty' 2>/dev/null || echo "0")

    echo -e "  CA 状态: ${BLUE}空闲:${CA_IDLE} 忙碌:${CA_BUSY} 创建中:${CA_CREATING} 总计:${CA_TOTAL}${NC}"
    echo -e "  队列长度: $(echo "$SCHEDULER_STATUS" | jq -r '.data.queueLength // empty' 2>/dev/null || echo "0")"
    echo -e "  运行中任务: $(echo "$SCHEDULER_STATUS" | jq -r '.data.currentTasks // empty' 2>/dev/null || echo "0")"
    
    echo ""
    
    # 检查是否有完成的任务
    COMPLETED_TASK=$(echo "$TASKS" | jq -r '.data[] | select(.status | IN(.status[]; "completed", "pr_submitted", "pr_merged")) | .id // empty' 2>/dev/null)

    if [ -n "$COMPLETED_TASK" ]; then
        echo -e "${GREEN}✓ 发现已完成的任务: $COMPLETED_TASK${NC}"

        # 显示已完成任务的详细信息
        COMPLETED_TASKS=$(echo "$TASKS" | jq -r '.data[] | select(.status | IN(.status[]; "completed", "pr_submitted", "pr_merged"))' 2>/dev/null)
        echo "$COMPLETED_TASKS" | jq -r '.data[] | {
            id: .id,
            type: .type,
            status: .status,
            completedAt: .completedAt
        }' 2>/dev/null || echo "$COMPLETED_TASKS"
    fi
    
    # 检查是否有失败的任务
    FAILED_TASK=$(echo "$TASKS" | jq -r '.data[] | select(.status == "error") | .id // empty' 2>/dev/null)

    if [ -n "$FAILED_TASK" ]; then
        echo -e "${RED}✗ 发现失败的任务: $FAILED_TASK${NC}"

        # 显示失败任务的详细信息
        FAILED_TASKS=$(echo "$TASKS" | jq -r '.data[] | select(.status == "error")' 2>/dev/null)
        echo "$FAILED_TASKS" | jq -r '.data[] | {
            id: .id,
            type: .type,
            status: .status,
            updatedAt: .updatedAt
        }' 2>/dev/null || echo "$FAILED_TASKS"
    fi
    
    # 检查日志目录
    if [ -d "./logs/tasks" ]; then
        echo -e "${BLUE}任务日志文件:${NC}"
        ls -lt ./logs/tasks/*.log 2>/dev/null | head -5 | xargs -I {} echo "  - {}"
    fi
    
    # 最后检查 PR 状态
    PR_INFO=$(curl -s "${API_URL}/prs" || echo '[]')
    PR_COUNT=$(echo "$PR_INFO" | jq -r '.data | length' 2>/dev/null || echo "0")

    if [ "$PR_COUNT" -gt 0 ]; then
        echo -e "${GREEN}✓ 发现 $PR_COUNT 个 PR${NC}"
        echo "$PR_INFO" | jq -r '.data[] | {
            id: .id,
            prTitle: .prTitle,
            prId: .prId
        }' 2>/dev/null || echo "$PR_INFO"
    fi
    
    echo -e "${BLUE}---${NC}"
    
    # 等待下一次检查
    sleep $CHECK_INTERVAL
done

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}测试完成${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${GREEN}测试总结:${NC}"
echo -e "  Issue URL: ${ISSUE_URL}"
echo -e "  Issue Number: ${ISSUE_NUMBER}"
echo -e "  查看完整日志: ./logs/tasks/"
echo -e "  查看任务状态: ${API_URL}/tasks"
echo -e "  查看调度器状态: ${API_URL}/tasks/scheduler-status"
echo ""
echo -e "${YELLOW}提示:${NC}"
echo -e "  - 可以通过 gh issue comment ${ISSUE_NUMBER} '...' 查看 TaskManager 在 Issue 上创建的错误评论"
echo -e "  - 可以检查 CA 容器: docker ps | grep 'hra_'"
echo -e "  - 可以查看本地日志: tail -f ./logs/tasks/*.log"
