# HR-AGENT-WEB 模块重构问题清单

本文档记录 hr-agent-web 模块需要整改的所有问题。

## 问题分类

### 1. 硬编码问题 (High)

#### 1.1 TaskModal/index.tsx 硬编码 CA URL
- **问题**: 第 32 行硬编码了 CA URL
- **影响文件**: `hr-agent-web/src/pages/TaskModal/index.tsx:32`
- **优先级**: High
- **建议修复方案**: 将 CA URL 提取到 constants.ts 中统一管理

#### 1.2 TaskCard/index.tsx 硬编码 CA URL
- **问题**: 第 129 行硬编码了 CA URL
- **影响文件**: `hr-agent-web/src/pages/TaskCard/index.tsx:129`
- **优先级**: High
- **建议修复方案**: 将 CA URL 提取到 constants.ts 中统一管理

---

### 2. 代码重复 (Medium)

#### 2.1 formatDate 函数重复
- **问题**: formatDate 函数在多个组件中重复定义
- **影响文件**:
  - `hr-agent-web/src/pages/Issues/index.tsx`
  - `hr-agent-web/src/pages/PRs/index.tsx`
  - `hr-agent-web/src/pages/IssueDetail/index.tsx`
  - `hr-agent-web/src/pages/PRDetail/index.tsx`
- **优先级**: Medium
- **建议修复方案**: 提取到 `utils/formatters.ts` 中统一管理

#### 2.2 getStatusTag 函数重复
- **问题**: getStatusTag 函数在多个组件中重复定义
- **影响文件**:
  - `hr-agent-web/src/pages/Issues/index.tsx`
  - `hr-agent-web/src/pages/PRs/index.tsx`
  - `hr-agent-web/src/pages/IssueDetail/index.tsx`
  - `hr-agent-web/src/pages/PRDetail/index.tsx`
- **优先级**: Medium
- **建议修复方案**: 提取到 `utils/formatters.ts` 或作为独立的可复用组件

---

### 3. 错误处理不完善 (High)

#### 3.1 登录失败无用户提示
- **问题**: 第 26-35 行登录失败时没有向用户显示错误提示
- **影响文件**: `hr-agent-web/src/pages/Login/index.tsx:26-35`
- **优先级**: High
- **建议修复方案**: 添加错误提示组件（如 message 或 notification），在登录失败时向用户展示具体错误信息

#### 3.2 创建 Issue 失败无用户提示
- **问题**: 第 146-154 行创建 Issue 失败时没有向用户显示错误提示
- **影响文件**: `hr-agent-web/src/pages/Issues/index.tsx:146-154`
- **优先级**: High
- **建议修复方案**: 添加错误处理逻辑，在创建失败时向用户展示具体错误信息

#### 3.3 创建 PR 失败无用户提示
- **问题**: 第 143-151 行创建 PR 失败时没有向用户显示错误提示
- **影响文件**: `hr-agent-web/src/pages/PRs/index.tsx:143-151`
- **优先级**: High
- **建议修复方案**: 添加错误处理逻辑，在创建失败时向用户展示具体错误信息

#### 3.4 IssueDetail 删除操作未调用 API
- **问题**: 第 38-42 行删除操作直接显示成功消息，未实际调用后端 API
- **影响文件**: `hr-agent-web/src/pages/IssueDetail/index.tsx:38-42`
- **优先级**: High
- **建议修复方案**: 调用后端 deleteIssue API，并根据 API 返回结果显示相应的成功或失败消息

#### 3.5 PRDetail 删除操作未调用 API
- **问题**: 第 38-41 行删除操作直接关闭对话框，未实际调用后端 API
- **影响文件**: `hr-agent-web/src/pages/PRDetail/index.tsx:38-41`
- **优先级**: High
- **建议修复方案**: 调用后端 deletePR API，并根据 API 返回结果执行相应的操作

---

### 4. 类型断言过多 (Low)

#### 4.1 TaskOrchestration 类型断言过多
- **问题**: 第 57、66 行使用了过多的 `as` 类型断言
- **影响文件**: `hr-agent-web/src/pages/TaskOrchestration/index.tsx:57,66`
- **优先级**: Low
- **建议修复方案**: 优化类型定义，减少类型断言的使用，使用类型守卫或更精确的类型定义

#### 4.2 TaskFormModal 参数未使用
- **问题**: 第 32 行参数未使用但保留了类型
- **影响文件**: `hr-agent-web/src/pages/TaskFormModal/index.tsx:32`
- **优先级**: Low
- **建议修复方案**: 如果参数确实不需要，删除该参数；如果需要，则在函数体中使用该参数

---

### 5. API 缺失功能 (Medium)

#### 5.1 Issue API 缺少更新和删除方法
- **问题**: api/issues.ts 文件缺少 updateIssue 和 deleteIssue 方法
- **影响文件**: `hr-agent-web/src/api/issues.ts`
- **优先级**: Medium
- **建议修复方案**: 添加 updateIssue 和 deleteIssue API 方法

#### 5.2 PR API 缺少更新和删除方法
- **问题**: api/prs.ts 文件缺少 updatePR 和 deletePR 方法
- **影响文件**: `hr-agent-web/src/api/prs.ts`
- **优先级**: Medium
- **建议修复方案**: 添加 updatePR 和 deletePR API 方法

---

### 6. 交互不完整 (Medium)

#### 6.1 IssueDetail 编辑按钮功能缺失
- **问题**: 第 66 行编辑按钮点击事件为空函数
- **影响文件**: `hr-agent-web/src/pages/IssueDetail/index.tsx:66`
- **优先级**: Medium
- **建议修复方案**: 实现编辑功能，可以打开编辑对话框或跳转到编辑页面

#### 6.2 PRDetail 编辑按钮功能缺失
- **问题**: 第 62 行编辑按钮点击事件为空函数
- **影响文件**: `hr-agent-web/src/pages/PRDetail/index.tsx:62`
- **优先级**: Medium
- **建议修复方案**: 实现编辑功能，可以打开编辑对话框或跳转到编辑页面

---

### 7. 常量命名不一致 (Low)

#### 7.1 看板列标题命名不一致
- **问题**: 第 17-24 行使用 COLUMN_TITLES，与 constants.ts 中的 KANBAN_COLUMNS 命名不一致
- **影响文件**: `hr-agent-web/src/pages/TaskKanban/index.tsx:17-24`
- **优先级**: Low
- **建议修复方案**: 统一使用 constants.ts 中的 KANBAN_COLUMNS，保持命名一致性

---

### 8. 缺少错误边界 (Medium)

#### 8.1 应用缺少 ErrorBoundary 组件
- **问题**: 整个应用缺少 ErrorBoundary 组件来捕获和处理运行时错误
- **影响范围**: 整个应用
- **优先级**: Medium
- **建议修复方案**: 在应用的根组件或关键路由处添加 ErrorBoundary 组件，提供友好的错误展示

---

### 9. 环境变量支持不足 (Medium)

#### 9.1 配置硬编码，缺少环境变量支持
- **问题**: CA URL 等配置项硬编码在代码中，不支持通过环境变量配置
- **影响范围**: 多个文件
- **优先级**: Medium
- **建议修复方案**: 将 CA URL 等配置项提取到环境变量中，使用 process.env 或类似方式读取

---

### 10. 代码注释过多 (Low)

#### 10.1 API 文件注释过多
- **问题**: 所有 API 文件都有大量 JSDoc 注释，部分注释可能不必要
- **影响文件**: `hr-agent-web/src/api/*.ts`
- **优先级**: Low
- **建议修复方案**: 移除非必要的注释，保留对复杂逻辑或关键业务逻辑的说明性注释

---

### 11. 参数命名不一致 (Low)

#### 11.1 未使用参数命名不一致
- **问题**: TaskKanban/index.tsx:35 使用 `_task`，TaskFormModal/index.tsx:14 使用 `_data`
- **影响文件**:
  - `hr-agent-web/src/pages/TaskKanban/index.tsx:35`
  - `hr-agent-web/src/pages/TaskFormModal/index.tsx:14`
- **优先级**: Low
- **建议修复方案**: 统一未使用参数的命名约定，建议统一使用 `_` 开头

---

### 12. Magic Numbers (Low)

#### 12.1 TaskKanban 硬编码值
- **问题**: 列宽度等值硬编码在组件中
- **影响文件**: `hr-agent-web/src/pages/TaskKanban/index.tsx`
- **优先级**: Low
- **建议修复方案**: 将硬编码值提取为具名常量，提高代码可读性和可维护性

#### 12.2 StatsDashboard 常量可优化
- **问题**: 第 26-29 行的常量可以进一步优化
- **影响文件**: `hr-agent-web/src/pages/StatsDashboard/index.tsx:26-29`
- **优先级**: Low
- **建议修复方案**: 将魔法数字提取为具名常量，使其更有意义

---

## 优先级统计

- **High (高优先级)**: 5 项
  - 硬编码问题: 2 项
  - 错误处理不完善: 3 项

- **Medium (中优先级)**: 6 项
  - 代码重复: 2 项
  - API 缺失功能: 2 项
  - 交互不完整: 2 项
  - 缺少错误边界: 1 项
  - 环境变量支持不足: 1 项

- **Low (低优先级)**: 6 项
  - 类型断言过多: 2 项
  - 常量命名不一致: 1 项
  - 代码注释过多: 1 项
  - 参数命名不一致: 1 项
  - Magic Numbers: 2 项

---

## 修复建议顺序

建议按照以下顺序进行修复：

1. **第一批（高优先级）**: 修复所有错误处理不完善的问题和硬编码问题，确保应用的基本功能和用户体验
2. **第二批（中优先级）**: 完善缺失的 API 功能和交互，添加错误边界组件和环境变量支持
3. **第三批（低优先级）**: 优化代码质量，包括类型断言、命名一致性、魔法数字等

---

## 备注

本清单基于代码审查结果生成，建议在修复过程中：
- 每修复一个问题后运行相关测试，确保不引入新的问题
- 遵循项目的代码规范和最佳实践
- 对复杂的修改先进行评估，必要时进行代码评审
