import { Card, Tag, Button, Space, Progress } from 'antd';
import {
  GithubOutlined,
  LinkOutlined,
  EditOutlined,
  DeleteOutlined,
  RobotOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import { TASK_STATUS_LABELS, TASK_STATUS_COLORS, PRIORITY_COLORS, type Task } from '../../types/task';
import { formatTimestamp, formatPriority } from '../../utils/formatters';
import './index.css';

interface TaskCardProps {
  task: Task;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  showActions?: boolean;
}

export function TaskCard({ task, onClick, onEdit, onDelete, showActions = true }: TaskCardProps) {
  const handleCAUrlClick = () => {
    if (task.codingAgent) {
      window.open('http://localhost:4096', '_blank');
    }
  };

  const handleIssueClick = () => {
    if (task.issue) {
      window.open(task.issue.issueUrl, '_blank');
    }
  };

  const handlePRClick = () => {
    if (task.pullRequest) {
      window.open(task.pullRequest.prId.toString(), '_blank');
    }
  };

  const isRunning = task.status === 'running' || task.status === 'retrying' || task.status === 'in_development';

  const progress = (() => {
    if (task.status === 'queued') {
      return 0;
    }
    if (task.status === 'running' || task.status === 'retrying') {
      return 50;
    }
    if (task.status === 'in_development') {
      return 70;
    }
    if (task.status === 'pr_submitted') {
      return 90;
    }
    if (task.status === 'pr_merged') {
      return 100;
    }
    return 0;
  })();

  return (
    <Card
      className={`task-card glass-card ${isRunning ? 'task-running' : ''}`}
      hoverable
      onClick={onClick}
      title={
        <Space size={8}>
          <span className="task-id">#{task.id}</span>
          <Tag
            color={TASK_STATUS_COLORS[task.status]}
            className="status-tag"
          >
            {TASK_STATUS_LABELS[task.status]}
          </Tag>
          <Tag
            color={PRIORITY_COLORS[task.priority] ?? 'default'}
            className="priority-tag"
          >
            {formatPriority(task.priority)}
          </Tag>
        </Space>
      }
      extra={
        showActions && (
          <Space onClick={(e) => e.stopPropagation()}>
            {onEdit && (
              <Button
                type="text"
                icon={<EditOutlined />}
                onClick={onEdit}
                size="small"
                className="action-btn"
              />
            )}
            {onDelete && (
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                onClick={onDelete}
                size="small"
                className="action-btn"
              />
            )}
          </Space>
        )
      }
    >
      <div className="task-content">
        <div className="task-type">
          <RobotOutlined className="type-icon" />
          <strong>{task.type}</strong>
        </div>

        {isRunning && (
          <div className="task-progress">
            <div className="progress-header">
              <ClockCircleOutlined />
              <span>AI 处理中...</span>
            </div>
            <Progress
              percent={progress}
              size="small"
              strokeColor="var(--purple-main)"
              showInfo={false}
            />
          </div>
        )}

        <div className="task-links">
          {task.issue && (
            <div className="task-link">
              <GithubOutlined />
              <Button
                type="link"
                onClick={handleIssueClick}
                className="link-btn"
              >
                #{task.issue.issueId}
              </Button>
            </div>
          )}
          {task.pullRequest && (
            <div className="task-link">
              <GithubOutlined />
              <Button
                type="link"
                onClick={handlePRClick}
                className="link-btn"
              >
                #{task.pullRequest.prId}
              </Button>
            </div>
          )}
          {task.codingAgent && (
            <div className="task-link">
              <LinkOutlined />
              <Button
                type="link"
                onClick={handleCAUrlClick}
                className="link-btn"
              >
                {task.codingAgent.caName}
              </Button>
            </div>
          )}
        </div>

        <div className="task-meta">
          <ClockCircleOutlined />
          <small>{formatTimestamp(task.createdAt)}</small>
        </div>
      </div>
    </Card>
  );
}
