import { Card, Tag, Button, Space, Progress } from 'antd';
import {
  GithubOutlined,
  LinkOutlined,
  EditOutlined,
  DeleteOutlined,
  RobotOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import {
  TASK_STATUS_LABELS,
  TASK_STATUS_COLORS,
  PRIORITY_COLORS,
  TASK_TAG_LABELS,
  TASK_TAG_COLORS,
  type Task
} from '../../types/task';
import { formatTimestamp, formatPriority } from '../../utils/formatters';
import { CA_BASE_URL } from '../../utils/constants';
import './index.css';

const PROGRESS_QUEUED = 0;
const PROGRESS_RUNNING = 50;
const PROGRESS_CREATING_CA = 20;
const PROGRESS_CONNECTING_CA = 30;
const PROGRESS_AI_CODING = 60;
const PROGRESS_CREATING_PR = 80;
const PROGRESS_PR_SUBMITTED = 90;
const PROGRESS_COMPLETED = 100;

interface TaskCardProps {
  task: Task;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  showActions?: boolean;
}

interface TaskCardContentProps {
  task: Task;
  handleIssueClick: () => void;
  handlePRClick: () => void;
  handleCAUrlClick: () => void;
  isRunning: boolean;
}

function getProgressByStatus(task: Task) {
  if (task.status === 'queued') {
    return PROGRESS_QUEUED;
  }
  if (task.status === 'running' || task.status === 'retrying') {
    return PROGRESS_RUNNING;
  }
  if (task.status === 'creating_ca') {
    return PROGRESS_CREATING_CA;
  }
  if (task.status === 'connecting_ca') {
    return PROGRESS_CONNECTING_CA;
  }
  if (task.status === 'ai_coding') {
    return PROGRESS_AI_CODING;
  }
  if (task.status === 'creating_pr') {
    return PROGRESS_CREATING_PR;
  }
  if (task.status === 'pr_submitted') {
    return PROGRESS_PR_SUBMITTED;
  }
  if (task.status === 'completed') {
    return PROGRESS_COMPLETED;
  }
  return PROGRESS_QUEUED;
}

function TaskCardContent({
  task,
  handleIssueClick,
  handlePRClick,
  handleCAUrlClick,
  isRunning
}: TaskCardContentProps) {
  const progress = getProgressByStatus(task);

  return (
    <div className="task-content">
      <div className="task-type">
        <RobotOutlined className="type-icon" />
        <strong>{task.type}</strong>
      </div>

      {task.tags && task.tags.length > 0 && (
        <div className="task-tags">
          {task.tags.map((tag) => (
            <Tag key={tag} color={TASK_TAG_COLORS[tag] ?? 'default'}>
              {TASK_TAG_LABELS[tag] ?? tag}
            </Tag>
          ))}
        </div>
      )}

      {isRunning && (
        <div className="task-progress">
          <div className="progress-header">
            <ClockCircleOutlined />
            <span>处理中</span>
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
            <Button type="link" onClick={handleIssueClick} className="link-btn">
              #{task.issue.issueId}
            </Button>
          </div>
        )}
        {task.pullRequest && (
          <div className="task-link">
            <GithubOutlined />
            <Button type="link" onClick={handlePRClick} className="link-btn">
              #{task.pullRequest.prId}
            </Button>
          </div>
        )}
        {task.codingAgent && (
          <div className="task-link">
            <LinkOutlined />
            <Button type="link" onClick={handleCAUrlClick} className="link-btn">
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
  );
}

export function TaskCard({ task, onClick, onEdit, onDelete, showActions = true }: TaskCardProps) {
  const handleCAUrlClick = () => {
    if (task.codingAgent) {
      window.open(CA_BASE_URL, '_blank');
    }
  };

  const handleIssueClick = () => {
    if (task.issue) {
      window.open(task.issue.issueUrl, '_blank');
    }
  };

  const handlePRClick = () => {
    if (task.pullRequest) {
      window.open(task.pullRequest.prUrl, '_blank');
    }
  };

  const isRunning =
    task.status === 'running' ||
    task.status === 'retrying' ||
    task.status === 'creating_ca' ||
    task.status === 'connecting_ca' ||
    task.status === 'ai_coding' ||
    task.status === 'creating_pr';

  return (
    <Card
      className={`task-card glass-card ${isRunning ? 'task-running' : ''}`}
      hoverable
      onClick={onClick}
      title={
        <Space size={8}>
          <span className="task-id">#{task.id}</span>
          <Tag color={TASK_STATUS_COLORS[task.status]} className="status-tag">
            {TASK_STATUS_LABELS[task.status]}
          </Tag>
          <Tag color={PRIORITY_COLORS[task.priority] ?? 'default'} className="priority-tag">
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
      <TaskCardContent
        task={task}
        handleIssueClick={handleIssueClick}
        handlePRClick={handlePRClick}
        handleCAUrlClick={handleCAUrlClick}
        isRunning={isRunning}
      />
    </Card>
  );
}
