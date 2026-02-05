# 🚀 执行分支删除 (Execute Branch Deletion)

## 立即执行 (Execute Now)

要完成分支删除任务，请执行以下步骤之一：

### ✅ 推荐方式：GitHub Actions

1. **访问工作流页面**: 
   - https://github.com/Eeymoo/open-hr-agent/actions/workflows/delete-merged-branches.yml

2. **点击 "Run workflow" 按钮** (绿色按钮，右上角)

3. **选择选项**:
   - Branch: `main` (或当前分支)
   - Dry run: `false` (实际删除) 或 `true` (测试模式)

4. **点击 "Run workflow" 确认**

5. **等待执行完成** (通常需要 10-30 秒)

6. **查看执行结果** 在工作流运行页面

---

### 🔧 替代方式：本地执行

如果你有本地仓库的访问权限：

```bash
# 克隆仓库（如果还没有）
git clone https://github.com/Eeymoo/open-hr-agent.git
cd open-hr-agent

# 运行清理脚本
chmod +x scripts/delete-merged-branches.sh
./scripts/delete-merged-branches.sh

# 脚本会列出要删除的分支，输入 'yes' 确认
```

---

### 📝 手动方式：逐个删除

如果需要更精细的控制：

```bash
# 逐个删除分支
git push origin --delete fix/docker-image-name
git push origin --delete feature/update-agents-workflow
git push origin --delete refactor/webhook-complexity
git push origin --delete feature/monorepo-structure
git push origin --delete docs/update-agents-md
git push origin --delete feat/add-docker-deployment
git push origin --delete feature/docker
git push origin --delete feature/hot-reload
```

---

## ✅ 验证删除成功

执行后，验证分支已被删除：

```bash
# 方式 1: 命令行
git fetch --prune
git branch -r | grep -E "feature|feat|fix|refactor|docs"

# 方式 2: GitHub 网页
# 访问 https://github.com/Eeymoo/open-hr-agent/branches
# 应该只看到 main 和当前 PR 分支
```

---

## 📊 预期结果

删除前：16 个远程分支  
删除后：~5-8 个远程分支（保留 main 和活跃的 PR 分支）

---

## ⚠️ 重要提示

- **首次运行**: 建议先用 `dry_run: true` 测试
- **权限要求**: 需要仓库的写入权限
- **安全性**: 所有分支都已合并，删除安全
- **可恢复**: 如需恢复，可以从对应的 PR 重新创建分支
