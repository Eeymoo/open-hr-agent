	这是一个完整的任务流程，你需要完成<Task></Task>中的任务，并且完成审查任务，创建PR。
	<Task></Task>
	要求：
	1. 按照要求高质量实现 Task，**仅修改任务相关的模块文件**。
	2. 在完成 Task 后，执行命令 `pnpm check` (或项目配置的等效检查命令)。如果有错误，必须修复直至通过。
	3. 使用 `gh` 操作 github：
	   - 创建 Draft PR 以便追踪进度。
	   - 检查 PR 的 CI 状态，如果 Actions 执行失败或出现代码冲突，需立即修复并重新推送。
	4. **任务拆分与提交**：
	   - 将 Task 拆分为具体的 Todo 列表。
	   - 每完成一个 Todo，进行一次原子性的 git commit。
	5. **同步策略**：
	   - 每个 Todo 开发前，先 `git fetch origin main` 并执行 `git rebase origin/main`，确保基于最新代码开发，避免冲突。
	   - 若出现 Rebase 冲突，需解决冲突后再继续开发。
	6. 最终确认所有 Todo 完成且 PR 状态为 "Ready for review" 或 CI 通过后，汇报任务结束。