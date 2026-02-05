import type { Request, Response } from 'express';
import Result from '../../utils/Result.js';

export default function agentsRoute(_req: Request, res: Response): void {
  res.json(
    new Result({
      agent_total: 3,
      agent_operation_list: [
        {
          agent_name: 'AICoding-ISS001',
          bind_issue_id: 'ISS001',
          create_time: '2026-02-03T09:15:30+08:0',
          consume_token: 1286,
          exec_status: '执行中',
          life_cycle: '持续运行',
          destroy_rule: '无（正常执行任务）'
        },
        {
          agent_name: 'AICoding-ISS002',
          bind_issue_id: 'ISS002',
          create_time: '2026-02-03T10:40:15+08:00',
          consume_token: 2549,
          exec_status: 'PR已创建-待主分支合并',
          life_cycle: '待销毁',
          destroy_rule: 'PR合并主分支后立即销毁'
        },
        {
          agent_name: 'AICoding-ISS003',
          bind_issue_id: 'ISS003',
          create_time: '2026-02-03T14:22:08+08:00',
          consume_token: 892,
          exec_status: '测试阶段',
          life_cycle: '开发验证',
          destroy_rule: '无（测试完成后进入正式执行）'
        }
      ]
    })
  );
}
