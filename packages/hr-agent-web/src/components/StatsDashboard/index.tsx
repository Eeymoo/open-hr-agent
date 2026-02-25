import { Card, Row, Col, Progress, Badge } from 'antd';
import {
  FileTextOutlined,
  LoadingOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  RobotOutlined,
  ApiOutlined,
  GitlabOutlined as IssueOutlined,
  BranchesOutlined as PROutlined
} from '@ant-design/icons';
import type { Task } from '../../types/task';
import type { Issue } from '../../types/issue';
import type { PullRequest } from '../../types/pr';
import { CountUp } from '../CountUp';
import { useCAStatus } from '../../hooks/useCas';
import { useIssues } from '../../hooks/useIssues';
import { usePRs } from '../../hooks/usePrs';
import { CA_STATUS_LABELS, CA_STATUS_COLORS, type CADetail } from '../../types/ca';

const PERCENTAGE_MAX = 100;
const GRID_GUTTER = 20;
const ANIMATION_DURATION = 2000;
const PROGRESS_STROKE_WIDTH = 12;
const MAX_CA_DISPLAY_COUNT = 4;
const ISSUE_PR_PAGE_SIZE = 100;

interface StatsDashboardProps {
  tasks: Task[];
}

export function StatsDashboard({ tasks }: StatsDashboardProps) {
  const { data: caResponse } = useCAStatus();
  const caStatus = caResponse?.data?.caPool;
  const caList = caResponse?.data?.caList ?? [];

  const { data: issuesData } = useIssues({ page: 1, pageSize: ISSUE_PR_PAGE_SIZE });
  const { data: prsData } = usePRs({ page: 1, pageSize: ISSUE_PR_PAGE_SIZE });

  const issues: Issue[] = issuesData?.issues ?? [];
  const prs: PullRequest[] = prsData?.prs ?? [];

  const stats = {
    total: tasks.length,
    queued: tasks.filter((t) => t.status === 'queued').length,
    running: tasks.filter((t) => t.status === 'running' || t.status === 'retrying').length,
    completed: tasks.filter((t) => t.status === 'completed').length,
    error: tasks.filter((t) => t.status === 'error').length
  };

  const issueStats = {
    total: issues.length,
    inProgress: issues.filter((i) => i.deletedAt < 0 && i.completedAt < 0).length,
    completed: issues.filter((i) => i.completedAt > -1).length,
    deleted: issues.filter((i) => i.deletedAt > -1).length
  };

  const prStats = {
    total: prs.length,
    inProgress: prs.filter((p) => p.deletedAt < 0 && p.completedAt < 0).length,
    merged: prs.filter((p) => p.completedAt > -1).length,
    deleted: prs.filter((p) => p.deletedAt > -1).length
  };

  const completionRate =
    stats.total > 0 ? Math.round((stats.completed / stats.total) * PERCENTAGE_MAX) : 0;

  return (
    <div>
      <TaskStatsCards stats={stats} duration={ANIMATION_DURATION} />
      <Row gutter={[GRID_GUTTER, GRID_GUTTER]} style={{ marginTop: GRID_GUTTER }}>
        <CompletionRateCard completionRate={completionRate} strokeWidth={PROGRESS_STROKE_WIDTH} />
        <AISystemCard caStatus={caStatus} queuedCount={stats.queued} />
        <CAResourcePoolCard caStatus={caStatus} caList={caList} maxDisplay={MAX_CA_DISPLAY_COUNT} />
      </Row>
      <Row gutter={[GRID_GUTTER, GRID_GUTTER]} style={{ marginTop: GRID_GUTTER }}>
        <IssueStatusCard issueStats={issueStats} />
        <PRStatusCard prStats={prStats} />
      </Row>
    </div>
  );
}

function TaskStatsCards({ stats, duration }: { stats: Record<string, number>; duration: number }) {
  const cards = [
    {
      key: 'total',
      icon: <FileTextOutlined />,
      label: '总任务数',
      value: stats.total,
      color: '#1890ff'
    },
    {
      key: 'running',
      icon: <LoadingOutlined spin />,
      label: '进行中',
      value: stats.running,
      showPulse: stats.running > 0,
      color: '#faad14'
    },
    {
      key: 'completed',
      icon: <CheckCircleOutlined />,
      label: '已完成',
      value: stats.completed,
      color: '#52c41a'
    },
    {
      key: 'error',
      icon: <ExclamationCircleOutlined />,
      label: '错误',
      value: stats.error,
      color: '#ff4d4f'
    }
  ];

  return (
    <Row gutter={[GRID_GUTTER, GRID_GUTTER]}>
      {cards.map((card) => (
        <Col key={card.key} xs={24} sm={12} lg={6}>
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ fontSize: 32, color: card.color }}>{card.icon}</div>
              <div>
                <div style={{ color: '#8c8c8c', fontSize: 14 }}>{card.label}</div>
                <div style={{ fontSize: 24, fontWeight: 600 }}>
                  <CountUp end={card.value} duration={duration} />
                </div>
              </div>
            </div>
          </Card>
        </Col>
      ))}
    </Row>
  );
}

function CompletionRateCard({
  completionRate,
  strokeWidth
}: {
  completionRate: number;
  strokeWidth: number;
}) {
  return (
    <Col xs={24} lg={8}>
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span>完成率</span>
          <span style={{ fontWeight: 600 }}>{completionRate}%</span>
        </div>
        <Progress
          percent={completionRate}
          strokeColor="#9333EA"
          strokeWidth={strokeWidth}
          showInfo={false}
        />
      </Card>
    </Col>
  );
}

function AISystemCard({
  caStatus,
  queuedCount
}: {
  caStatus?: { total?: number; busy?: number; idle?: number };
  queuedCount: number;
}) {
  return (
    <Col xs={24} lg={8}>
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <RobotOutlined style={{ fontSize: 20, color: '#9333EA' }} />
          <span style={{ fontWeight: 600 }}>AI 系统状态</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#8c8c8c' }}>活跃 Agent</span>
            <span>
              {caStatus?.busy ?? 0} / {caStatus?.total ?? 0}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#8c8c8c' }}>处理队列</span>
            <span>{queuedCount} 个</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#8c8c8c' }}>空闲 Agent</span>
            <span>{caStatus?.idle ?? 0} 个</span>
          </div>
        </div>
      </Card>
    </Col>
  );
}

function CAResourcePoolCard({
  caStatus,
  caList,
  maxDisplay
}: {
  caStatus?: { idle?: number; busy?: number; creating?: number; error?: number };
  caList: CADetail[];
  maxDisplay: number;
}) {
  const statusSummary = [
    { label: '空闲', count: caStatus?.idle ?? 0, color: '#52c41a' },
    { label: '忙碌', count: caStatus?.busy ?? 0, color: '#faad14' },
    { label: '创建中', count: caStatus?.creating ?? 0, color: '#1890ff' },
    { label: '错误', count: caStatus?.error ?? 0, color: '#ff4d4f' }
  ];

  return (
    <Col xs={24} lg={8}>
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <ApiOutlined style={{ fontSize: 20, color: '#9333EA' }} />
          <span style={{ fontWeight: 600 }}>CA 资源池</span>
        </div>
        <div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 16 }}>
            {statusSummary.map((item) => (
              <Badge key={item.label} color={item.color} text={`${item.label}: ${item.count}`} />
            ))}
          </div>
          {caList.length > 0 && (
            <div>
              <div style={{ color: '#8c8c8c', marginBottom: 8 }}>CA 列表 ({caList.length})</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {caList.slice(0, maxDisplay).map((ca: CADetail) => (
                  <div key={ca.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{ca.caName}</span>
                    <Badge
                      status={
                        CA_STATUS_COLORS[ca.status] as
                          | 'success'
                          | 'processing'
                          | 'default'
                          | 'error'
                          | 'warning'
                      }
                      text={CA_STATUS_LABELS[ca.status]}
                    />
                  </div>
                ))}
                {caList.length > maxDisplay && (
                  <div style={{ color: '#8c8c8c' }}>+{caList.length - maxDisplay} 更多</div>
                )}
              </div>
            </div>
          )}
        </div>
      </Card>
    </Col>
  );
}

function IssueStatusCard({
  issueStats
}: {
  issueStats: { total: number; inProgress: number; completed: number; deleted: number };
}) {
  return (
    <Col xs={24} lg={12}>
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <IssueOutlined style={{ fontSize: 20, color: '#1890ff' }} />
          <span style={{ fontWeight: 600 }}>Issues 状态</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#8c8c8c' }}>进行中</span>
            <span>{issueStats.inProgress}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#8c8c8c' }}>已完成</span>
            <span>{issueStats.completed}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#8c8c8c' }}>已删除</span>
            <span>{issueStats.deleted}</span>
          </div>
        </div>
      </Card>
    </Col>
  );
}

function PRStatusCard({
  prStats
}: {
  prStats: { total: number; inProgress: number; merged: number; deleted: number };
}) {
  return (
    <Col xs={24} lg={12}>
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <PROutlined style={{ fontSize: 20, color: '#52c41a' }} />
          <span style={{ fontWeight: 600 }}>PRs 状态</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#8c8c8c' }}>进行中</span>
            <span>{prStats.inProgress}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#8c8c8c' }}>已合并</span>
            <span>{prStats.merged}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#8c8c8c' }}>已删除</span>
            <span>{prStats.deleted}</span>
          </div>
        </div>
      </Card>
    </Col>
  );
}
