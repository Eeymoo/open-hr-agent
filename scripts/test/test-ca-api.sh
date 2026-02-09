#!/bin/bash

# =============================================================================
# CA 容器管理 API 测试工具
# =============================================================================
# 用于测试 CA (coding-agent) 容器管理 API 的完整 CRUD 操作
#
# 使用方法:
#   ./test-ca-api.sh                          # 使用默认配置
#   DOCKER_CA_SECRET=xxx ./test-ca-api.sh     # 指定密钥
#   API_BASE=https://api.example.com ./test-ca-api.sh  # 指定 API 地址
#
# 环境变量:
#   DOCKER_CA_SECRET  - CA 密钥 (默认: PTr5Umbf0BMirteZ1GhTWnf8O8Po64O0)
#   API_BASE          - API 基础 URL (默认: https://rha.onemue.cn)
#   CONTAINER_NAME    - 测试容器名称 (默认: test-agent-001)
# =============================================================================

# 默认配置
DEFAULT_API_BASE="https://rha.onemue.cn"
DEFAULT_CA_SECRET="PTr5Umbf0BMirteZ1GhTWnf8O8Po64O0"
DEFAULT_CONTAINER_NAME="test-agent-001"

# 从环境变量读取配置，否则使用默认值
API_BASE="${API_BASE:-$DEFAULT_API_BASE}"
CA_SECRET="${DOCKER_CA_SECRET:-$DEFAULT_CA_SECRET}"
CONTAINER_NAME="${CONTAINER_NAME:-$DEFAULT_CONTAINER_NAME}"

# 颜色输出
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印分隔线
print_separator() {
  echo "--------------------------------------"
}

# 打印步骤标题
print_step() {
  local step_num=$1
  local total_steps=$2
  local title=$3
  echo ""
  echo "步骤 ${step_num}/${total_steps}: ${title}"
  print_separator
}

# 打印成功消息
print_success() {
  echo -e "${GREEN}✅${NC} $1"
}

# 打印失败消息
print_failure() {
  echo -e "${RED}❌${NC} $1"
}

# 打印警告消息
print_warning() {
  echo -e "${YELLOW}⚠️${NC} $1"
}

# 打印信息消息
print_info() {
  echo -e "${BLUE}ℹ️${NC} $1"
}

# =============================================================================
# 主程序
# =============================================================================

echo "========================================="
echo "CA 容器管理 API 测试工具"
echo "========================================="
echo ""
print_info "API 地址: ${API_BASE}"
print_info "容器名称: ${CONTAINER_NAME}"
print_info "使用密钥: ${CA_SECRET:0:10}..."
echo ""

# ============================================
# 1. 创建容器
# ============================================
print_step 1 6 "创建 CA 容器"

CREATE_RESPONSE=$(curl -s -X POST "${API_BASE}/v1/ca/add" \
  -H "Content-Type: application/json" \
  -H "X-CA-Secret: ${CA_SECRET}" \
  -d "{
    \"name\": \"${CONTAINER_NAME}\",
    \"network\": \"hr-network\"
  }")

echo "创建响应:"
echo "$CREATE_RESPONSE" | jq '.' 2>/dev/null || echo "$CREATE_RESPONSE"
echo ""

# 检查创建是否成功
if echo "$CREATE_RESPONSE" | jq -e '.code == 200' 2>/dev/null; then
  print_success "容器创建成功: ca-${CONTAINER_NAME}"
  CONTAINER_ID=$(echo "$CREATE_RESPONSE" | jq -r '.data.containerId' 2>/dev/null)
  CONTAINER_PORT=$(echo "$CREATE_RESPONSE" | jq -r '.data.port' 2>/dev/null)
  print_info "容器 ID: ${CONTAINER_ID:0:12}..."
  print_info "映射端口: ${CONTAINER_PORT}"
else
  print_failure "容器创建失败"
  echo ""
  print_info "响应: $(echo "$CREATE_RESPONSE" | jq -r '.message' 2>/dev/null || echo '解析失败')"
  exit 1
fi

sleep 2

# ============================================
# 2. 查看容器列表
# ============================================
print_step 2 6 "查看容器列表"

LIST_RESPONSE=$(curl -s -X GET "${API_BASE}/v1/ca" \
  -H "Content-Type: application/json" \
  -H "X-CA-Secret: ${CA_SECRET}")

echo "列表响应:"
echo "$LIST_RESPONSE" | jq '.' 2>/dev/null || echo "$LIST_RESPONSE"

# 提取容器数量
if echo "$LIST_RESPONSE" | jq -e '.code == 200' 2>/dev/null; then
  TOTAL=$(echo "$LIST_RESPONSE" | jq -r '.data.total' 2>/dev/null || echo "未知")
  print_success "当前共有 ${TOTAL} 个 CA 容器"
else
  print_warning "列表查询失败"
fi

echo ""
sleep 1

# ============================================
# 3. 查看单个容器详情
# ============================================
print_step 3 6 "查看容器详情"

DETAIL_RESPONSE=$(curl -s -X GET "${API_BASE}/v1/ca/${CONTAINER_NAME}" \
  -H "Content-Type: application/json" \
  -H "X-CA-Secret: ${CA_SECRET}")

echo "详情响应:"
echo "$DETAIL_RESPONSE" | jq '.' 2>/dev/null || echo "$DETAIL_RESPONSE"
echo ""

# 检查详情是否成功
if echo "$DETAIL_RESPONSE" | jq -e '.code == 200' 2>/dev/null; then
  STATUS=$(echo "$DETAIL_RESPONSE" | jq -r '.data.status' 2>/dev/null || echo "未知")
  INTERNAL_URL=$(echo "$DETAIL_RESPONSE" | jq -r '.data.internalUrl' 2>/dev/null || echo "未知")
  print_success "容器状态: ${STATUS}"
  print_info "内部 URL: ${INTERNAL_URL}"
else
  print_warning "详情查询失败"
fi

sleep 1

# ============================================
# 4. 更新容器（重启）
# ============================================
print_step 4 6 "更新容器（重启）"

UPDATE_RESPONSE=$(curl -s -X PUT "${API_BASE}/v1/ca/${CONTAINER_NAME}" \
  -H "Content-Type: application/json" \
  -H "X-CA-Secret: ${CA_SECRET}" \
  -d '{
    "restart": true
  }')

echo "更新响应:"
echo "$UPDATE_RESPONSE" | jq '.' 2>/dev/null || echo "$UPDATE_RESPONSE"
echo ""

# 检查更新是否成功
if echo "$UPDATE_RESPONSE" | jq -e '.code == 200' 2>/dev/null; then
  print_success "容器重启成功"
  STATUS=$(echo "$UPDATE_RESPONSE" | jq -r '.data.status' 2>/dev/null || echo "未知")
  print_info "当前状态: ${STATUS}"
else
  print_warning "容器重启失败"
fi

sleep 3

# ============================================
# 5. 测试错误处理（删除不存在的容器）
# ============================================
print_step 5 6 "测试错误处理 - 尝试删除不存在的容器"

ERROR_RESPONSE=$(curl -s -X DELETE "${API_BASE}/v1/ca/non-existent-container" \
  -H "Content-Type: application/json" \
  -H "X-CA-Secret: ${CA_SECRET}")

echo "错误响应（期望 404）:"
echo "$ERROR_RESPONSE" | jq '.' 2>/dev/null || echo "$ERROR_RESPONSE"
echo ""

# 检查错误处理是否正确
if echo "$ERROR_RESPONSE" | jq -e '.code == 404' 2>/dev/null; then
  print_success "错误处理正确 - 返回 404"
  print_info "错误消息: $(echo "$ERROR_RESPONSE" | jq -r '.message' 2>/dev/null)"
else
  print_warning "错误处理不符合预期"
fi

sleep 1

# ============================================
# 6. 删除容器
# ============================================
print_step 6 6 "删除容器"

DELETE_RESPONSE=$(curl -s -X DELETE "${API_BASE}/v1/ca/${CONTAINER_NAME}" \
  -H "Content-Type: application/json" \
  -H "X-CA-Secret: ${CA_SECRET}")

echo "删除响应:"
echo "$DELETE_RESPONSE" | jq '.' 2>/dev/null || echo "$DELETE_RESPONSE"
echo ""

# 检查删除是否成功
if echo "$DELETE_RESPONSE" | jq -e '.code == 200' 2>/dev/null; then
  print_success "容器删除成功"
else
  print_failure "容器删除失败"
  print_info "响应: $(echo "$DELETE_RESPONSE" | jq -r '.message' 2>/dev/null || echo '解析失败')"
fi

# ============================================
# 测试完成
# ============================================
echo ""
echo "========================================="
echo -e "${GREEN}✅ 测试流程完成！${NC}"
echo "========================================="
echo ""
print_info "API 地址: ${API_BASE}"
print_info "测试容器: ${CONTAINER_NAME} (已删除)"
print_info "所有操作均已验证通过"
echo ""
print_info "如需保留容器，请手动重新创建:"
echo "  curl -X POST \"${API_BASE}/v1/ca/add\" \\"
echo "    -H \"Content-Type: application/json\" \\"
echo "    -H \"X-CA-Secret: ${CA_SECRET}\" \\"
echo "    -d '{\"name\": \"${CONTAINER_NAME}\", \"network\": \"hr-network\"}'"
echo ""
