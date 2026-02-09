import { Card, Tag, Button, Space } from 'antd';
import { GithubOutlined, LinkOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
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

  return (
    <Card
      className="task-card"
      hoverable
      onClick={onClick}
      title={
        <Space>
          <span className="task-id">#{task.id}</span>
          <Tag color={TASK_STATUS_COLORS[task.status]}>{TASK_STATUS_LABELS[task.status]}</Tag>
          <Tag color={PRIORITY_COLORS[task.priority] ?? 'default'}>
            {formatPriority(task.priority)}
          </Tag>
        </Space>
      }
      extra={
        showActions && (
          <Space onClick={(e) => e.stopPropagation()}>
            {onEdit && <Button type="text" icon={<EditOutlined />} onClick={onEdit} size="small" />}
            {onDelete && (
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                onClick={onDelete}
                size="small"
              />
            )}
          </Space>
        )
      }
    >
      <div className="task-content">
        <div className="task-type">
          <strong>{task.type}</strong>
        </div>
        {task.issue && (
          <div className="task-link">
            <GithubOutlined />
            <Button type="link" onClick={handleIssueClick}>
              Issue #{task.issue.issueId}
            </Button>
          </div>
        )}
        {task.pullRequest && (
          <div className="task-link">
            <GithubOutlined />
            <Button type="link" onClick={handlePRClick}>
              PR #{task.pullRequest.prId}
            </Button>
          </div>
        )}
        {task.codingAgent && (
          <div className="task-link">
            <LinkOutlined />
            <Button type="link" onClick={handleCAUrlClick}>
              CA {task.codingAgent.caName}
            </Button>
          </div>
        )}
        <div className="task-meta">
          <small>创建时间: {formatTimestamp(task.createdAt)}</small>
        </div>
      </div>
    </Card>
  );
}
