import { Card, Row, Col, Progress } from 'antd';
import {
  FileTextOutlined,
  LoadingOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  RobotOutlined
} from '@ant-design/icons';
import type { Task } from '../../types/task';
import { CountUp } from '../CountUp';
import './index.css';

interface StatsDashboardProps {
  tasks: Task[];
}

export function StatsDashboard({ tasks }: StatsDashboardProps) {
  const stats = {
    total: tasks.length,
    queued: tasks.filter((t) => t.status === 'queued').length,
    running: tasks.filter((t) => t.status === 'running' || t.status === 'retrying').length,
    completed: tasks.filter((t) => t.status === 'pr_merged').length,
    error: tasks.filter((t) => t.status === 'error').length
  };

  const completionRate = stats.total > 0
    ? Math.round((stats.completed / stats.total) * 100)
    : 0;

  return (
    <div className="stats-dashboard">
      <Row gutter={[20, 20]}>
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card stat-total">
            <div className="stat-icon total">
              <FileTextOutlined />
            </div>
            <div className="stat-content">
              <div className="stat-label">总任务数</div>
              <div className="stat-value">
                <CountUp end={stats.total} duration={2000} />
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card stat-running">
            <div className="stat-icon running">
              <LoadingOutlined spin />
            </div>
            <div className="stat-content">
              <div className="stat-label">进行中</div>
              <div className="stat-value">
                <CountUp end={stats.running} duration={2000} />
              </div>
            </div>
            {stats.running > 0 && <div className="stat-pulse" />}
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card stat-completed">
            <div className="stat-icon completed">
              <CheckCircleOutlined />
            </div>
            <div className="stat-content">
              <div className="stat-label">已完成</div>
              <div className="stat-value">
                <CountUp end={stats.completed} duration={2000} />
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card stat-error">
            <div className="stat-icon error">
              <ExclamationCircleOutlined />
            </div>
            <div className="stat-content">
              <div className="stat-label">错误</div>
              <div className="stat-value">
                <CountUp end={stats.error} duration={2000} />
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[20, 20]} style={{ marginTop: 20 }}>
        <Col xs={24} lg={12}>
          <Card className="progress-card">
            <div className="progress-header">
              <span className="progress-label">完成率</span>
              <span className="progress-value">{completionRate}%</span>
            </div>
            <Progress
              percent={completionRate}
              strokeColor="#9333EA"
              strokeWidth={12}
              showInfo={false}
            />
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card className="ai-status-card">
            <div className="ai-status-header">
              <RobotOutlined className="ai-icon" />
              <span className="ai-status-title">AI 系统状态</span>
            </div>
            <div className="ai-status-content">
              <div className="status-item">
                <span className="status-label">活跃 Agent</span>
                <span className="status-value">{stats.running} 个</span>
              </div>
              <div className="status-item">
                <span className="status-label">处理队列</span>
                <span className="status-value">{stats.queued} 个</span>
              </div>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
