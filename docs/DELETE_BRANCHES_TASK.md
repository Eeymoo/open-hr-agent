# 🗑️ 删除已合并分支 (Delete Merged Branches)

## 任务说明 (Task Description)

本任务的目标是清理所有已经合并到主分支的远程分支，保持仓库整洁。

**This task aims to clean up all remote branches that have been merged to the main branch, keeping the repository clean.**

---

## ⚡ 快速执行 (Quick Start)

### 方法 1: GitHub Actions 工作流（推荐）

1. 访问 [GitHub Actions](https://github.com/Eeymoo/open-hr-agent/actions/workflows/delete-merged-branches.yml)
2. 点击 "Run workflow"
3. 选择是否进行 dry-run（测试模式）
4. 点击 "Run workflow" 确认执行

### 方法 2: 本地脚本

```bash
# 进入项目目录
cd /home/runner/work/open-hr-agent/open-hr-agent

# 运行清理脚本
./scripts/delete-merged-branches.sh
```

### 方法 3: 手动删除

```bash
# 删除各个已合并的分支
git push origin --delete fix/docker-image-name
git push origin --delete feature/update-agents-workflow
git push origin --delete refactor/webhook-complexity
git push origin --delete feature/monorepo-structure
git push origin --delete docs/update-agents-md
git push origin --delete feat/add-docker-deployment
git push origin --delete feature/docker
git push origin --delete feature/hot-reload

# 清理本地引用
git fetch --prune
```

---

## 📋 待删除的分支列表 (Branches to Delete)

以下分支已通过 PR 合并到主分支，可以安全删除：

| 分支名称 (Branch Name) | PR 编号 | 合并日期 (Merged Date) | 状态 (Status) |
|----------------------|---------|----------------------|--------------|
| `fix/docker-image-name` | #13 | 2026-02-05 07:19 | ✓ 已合并 |
| `feature/update-agents-workflow` | #11 | 2026-02-05 05:25 | ✓ 已合并 |
| `refactor/webhook-complexity` | #10 | 2026-02-05 05:24 | ✓ 已合并 |
| `feature/monorepo-structure` | #9 | 2026-02-05 05:04 | ✓ 已合并 |
| `docs/update-agents-md` | #8 | 2026-02-05 03:36 | ✓ 已合并 |
| `feat/add-docker-deployment` | #6 | 2026-02-04 18:40 | ✓ 已合并 |
| `feature/docker` | #3 | 2026-02-04 18:16 | ✓ 已合并 |
| `feature/hot-reload` | #1 | 2026-02-04 17:58 | ✓ 已合并 |

---

## ✅ 验证 (Verification)

删除后，验证分支已被移除：

```bash
# 查看剩余的远程分支
git fetch --prune
git branch -r

# 或查看 GitHub 网页端
# https://github.com/Eeymoo/open-hr-agent/branches
```

---

## 📚 更多信息 (More Information)

详细文档请参考：
- 📖 [docs/BRANCH_CLEANUP.md](./BRANCH_CLEANUP.md) - 完整的分支清理文档
- 🔧 [scripts/delete-merged-branches.sh](../scripts/delete-merged-branches.sh) - 自动化清理脚本
- ⚙️ [.github/workflows/delete-merged-branches.yml](../.github/workflows/delete-merged-branches.yml) - GitHub Actions 工作流

---

## ⚠️ 注意事项 (Important Notes)

1. **安全性**: 所有待删除的分支都已经合并到主分支，删除不会丢失代码
2. **范围**: 只删除远程分支，不影响本地分支
3. **权限**: 需要仓库的写入权限才能删除分支
4. **恢复**: 如果误删，可以从 PR 历史中恢复分支

---

## 🎯 任务完成标准 (Completion Criteria)

- ✅ 所有 8 个已合并分支从远程仓库删除
- ✅ 本地引用已清理 (`git fetch --prune`)
- ✅ 通过 `git branch -r` 或 GitHub 网页端确认分支已删除
- ✅ 仓库分支列表只保留活跃分支（main 和未合并的功能分支）
