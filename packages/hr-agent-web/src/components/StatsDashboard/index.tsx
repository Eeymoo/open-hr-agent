import { Card, Row, Col, Progress, Badge } from 'antd';
import {
  FileTextOutlined,
  LoadingOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  RobotOutlined,
  ApiOutlined
} from '@ant-design/icons';
import type { Task } from '../../types/task';
import { CountUp } from '../CountUp';
import { useCAStatus } from '../../hooks/useCAs';
import { CA_STATUS_LABELS, CA_STATUS_COLORS, type CADetail } from '../../types/ca';
import './index.css';

const PERCENTAGE_MAX = 100;
const GRID_GUTTER = 20;
const ANIMATION_DURATION = 2000;
const PROGRESS_STROKE_WIDTH = 12;
const MAX_CA_DISPLAY_COUNT = 4;

interface StatsDashboardProps {
  tasks: Task[];
}

export function StatsDashboard({ tasks }: StatsDashboardProps) {
  const { data: caResponse } = useCAStatus();
  const caStatus = caResponse?.data?.caPool;
  const caList = caResponse?.data?.caList ?? [];

  const stats = {
    total: tasks.length,
    queued: tasks.filter((t) => t.status === 'queued').length,
    running: tasks.filter((t) => t.status === 'running' || t.status === 'retrying').length,
    completed: tasks.filter((t) => t.status === 'completed').length,
    error: tasks.filter((t) => t.status === 'error').length
  };

  const completionRate =
    stats.total > 0 ? Math.round((stats.completed / stats.total) * PERCENTAGE_MAX) : 0;

  return (
    <div className="stats-dashboard">
      <TaskStatsCards stats={stats} duration={ANIMATION_DURATION} />
      <Row gutter={[GRID_GUTTER, GRID_GUTTER]} style={{ marginTop: GRID_GUTTER }}>
        <CompletionRateCard completionRate={completionRate} strokeWidth={PROGRESS_STROKE_WIDTH} />
        <AISystemCard caStatus={caStatus} queuedCount={stats.queued} />
        <CAResourcePoolCard caStatus={caStatus} caList={caList} maxDisplay={MAX_CA_DISPLAY_COUNT} />
      </Row>
    </div>
  );
}

function TaskStatsCards({ stats, duration }: { stats: Record<string, number>; duration: number }) {
  const cards = [
    {
      key: 'total',
      icon: <FileTextOutlined />,
      className: 'stat-total',
      label: '总任务数',
      value: stats.total
    },
    {
      key: 'running',
      icon: <LoadingOutlined spin />,
      className: 'stat-running',
      label: '进行中',
      value: stats.running,
      showPulse: stats.running > 0
    },
    {
      key: 'completed',
      icon: <CheckCircleOutlined />,
      className: 'stat-completed',
      label: '已完成',
      value: stats.completed
    },
    {
      key: 'error',
      icon: <ExclamationCircleOutlined />,
      className: 'stat-error',
      label: '错误',
      value: stats.error
    }
  ];

  return (
    <Row gutter={[GRID_GUTTER, GRID_GUTTER]}>
      {cards.map((card) => (
        <Col key={card.key} xs={24} sm={12} lg={6}>
          <Card className={`stat-card ${card.className}`}>
            <div className={`stat-icon ${card.className}`}>{card.icon}</div>
            <div className="stat-content">
              <div className="stat-label">{card.label}</div>
              <div className="stat-value">
                <CountUp end={card.value} duration={duration} />
              </div>
            </div>
            {card.showPulse && <div className="stat-pulse" />}
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
      <Card className="progress-card">
        <div className="progress-header">
          <span className="progress-label">完成率</span>
          <span className="progress-value">{completionRate}%</span>
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
      <Card className="ai-status-card">
        <div className="ai-status-header">
          <RobotOutlined className="ai-icon" />
          <span className="ai-status-title">AI 系统状态</span>
        </div>
        <div className="ai-status-content">
          <div className="status-item">
            <span className="status-label">活跃 Agent</span>
            <span className="status-value">
              {caStatus?.busy ?? 0} / {caStatus?.total ?? 0}
            </span>
          </div>
          <div className="status-item">
            <span className="status-label">处理队列</span>
            <span className="status-value">{queuedCount} 个</span>
          </div>
          <div className="status-item">
            <span className="status-label">空闲 Agent</span>
            <span className="status-value">{caStatus?.idle ?? 0} 个</span>
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
      <Card className="ca-pool-card">
        <div className="ai-status-header">
          <ApiOutlined className="ai-icon" />
          <span className="ai-status-title">CA 资源池</span>
        </div>
        <div className="ca-pool-content">
          <div className="ca-status-summary">
            {statusSummary.map((item) => (
              <div key={item.label} className="ca-status-item">
                <Badge color={item.color} text={`${item.label}: ${item.count}`} />
              </div>
            ))}
          </div>
          {caList.length > 0 && (
            <div className="ca-list">
              <div className="ca-list-title">CA 列表 ({caList.length})</div>
              <div className="ca-list-items">
                {caList.slice(0, maxDisplay).map((ca: CADetail) => (
                  <div key={ca.id} className="ca-list-item">
                    <div className="ca-item-name">{ca.caName}</div>
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
                  <div className="ca-list-more">+{caList.length - maxDisplay} 更多</div>
                )}
              </div>
            </div>
          )}
        </div>
      </Card>
    </Col>
  );
}
