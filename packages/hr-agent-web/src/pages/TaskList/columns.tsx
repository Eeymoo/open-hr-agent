import { Space, Tag, Button, Tooltip, Progress } from 'antd';
import {
  GithubOutlined,
  LinkOutlined,
  ClockCircleOutlined,
  RobotOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  LoadingOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  TASK_STATUS_LABELS,
  TASK_STATUS_COLORS,
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  PRIORITY_LOW,
  PRIORITY_MEDIUM,
  PRIORITY_HIGH,
  type Task,
  type TaskStatus
} from '../../types/task';
import { formatTimestamp, formatRelativeTime } from '../../utils/formatters';
import { CA_BASE_URL } from '../../utils/constants';

const RUNNING_STATUSES = ['running', 'retrying', 'in_development'];
const ERROR_STATUSES = ['error', 'timeout'];
const COLOR_BLUE = '#3b82f6';
const COLOR_GREEN = '#10b981';
const COLOR_RED = '#ef4444';
const COLOR_GRAY = '#6b7280';
const COLOR_PURPLE = '#9333EA';

const getStatusIcon = (status: TaskStatus) => {
  switch (status) {
    case 'running':
    case 'retrying':
    case 'in_development':
      return <LoadingOutlined spin style={{ color: COLOR_BLUE }} />;
    case 'pr_merged':
    case 'development_complete':
      return <CheckCircleOutlined style={{ color: COLOR_GREEN }} />;
    case 'error':
    case 'timeout':
      return <ExclamationCircleOutlined style={{ color: COLOR_RED }} />;
    default:
      return <ClockCircleOutlined style={{ color: COLOR_GRAY }} />;
  }
};

const getProgressByStatus = (status: TaskStatus): number => {
  const progressMap: Record<TaskStatus, number> = {
    planned: 0,
    queued: 0,
    running: 50,
    retrying: 50,
    in_development: 70,
    development_complete: 80,
    pr_submitted: 90,
    pr_merged: 100,
    pr_comments_resolved: 95,
    error: 0,
    cancelled: 0,
    timeout: 0
  };
  return progressMap[status] ?? 0;
};

export const isRunningStatus = (status: TaskStatus): boolean => {
  return RUNNING_STATUSES.includes(status);
};

const renderIssueColumn = (_: unknown, record: Task) => {
  if (!record.issue) {
    return <span className="task-list-empty">-</span>;
  }
  return (
    <Tooltip title={record.issue?.issueTitle}>
      <Button
        type="link"
        size="small"
        icon={<GithubOutlined />}
        onClick={() => {
          if (record.issue) {
            window.open(record.issue.issueUrl, '_blank');
          }
        }}
        className="task-list-link"
      >
        #{record.issue.issueId}
      </Button>
    </Tooltip>
  );
};

const renderPRColumn = (_: unknown, record: Task) => {
  if (!record.pullRequest) {
    return <span className="task-list-empty">-</span>;
  }
  return (
    <Button
      type="link"
      size="small"
      icon={<GithubOutlined />}
      onClick={() => {
        if (record.pullRequest) {
          window.open(record.pullRequest.prUrl, '_blank');
        }
      }}
      className="task-list-link"
    >
      #{record.pullRequest.prId}
    </Button>
  );
};

const renderCAColumn = (_: unknown, record: Task) => {
  if (!record.codingAgent) {
    return <span className="task-list-empty">-</span>;
  }
  return (
    <Button
      type="link"
      size="small"
      icon={<LinkOutlined />}
      onClick={() => {
        window.open(CA_BASE_URL, '_blank');
      }}
      className="task-list-link"
    >
      {record.codingAgent.caName}
    </Button>
  );
};

export const getTaskListColumns = (onNavigate: (path: string) => void): ColumnsType<Task> => [
  {
    title: 'ID',
    dataIndex: 'id',
    key: 'id',
    width: 80,
    fixed: 'left',
    render: (id: number) => (
      <span
        className="task-list-id"
        onClick={() => {
          onNavigate('/dashboard');
        }}
      >
        #{id}
      </span>
    )
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: 140,
    render: (status: TaskStatus) => (
      <Space size={4}>
        {getStatusIcon(status)}
        <Tag color={TASK_STATUS_COLORS[status]} className="task-list-status-tag">
          {TASK_STATUS_LABELS[status]}
        </Tag>
      </Space>
    ),
    sorter: (a: Task, b: Task) => a.status.localeCompare(b.status)
  },
  {
    title: '进度',
    key: 'progress',
    width: 150,
    render: (_: unknown, record: Task) => {
      const progress = getProgressByStatus(record.status);
      const isRunning = isRunningStatus(record.status);
      return (
        <div className="task-list-progress">
          <Progress
            percent={progress}
            size="small"
            strokeColor={isRunning ? COLOR_BLUE : COLOR_PURPLE}
            showInfo={false}
            className={isRunning ? 'progress-animated' : ''}
          />
          <span className="progress-text">{progress}%</span>
        </div>
      );
    }
  },
  {
    title: '类型',
    dataIndex: 'type',
    key: 'type',
    width: 150,
    render: (type: string) => (
      <Space size={6}>
        <RobotOutlined className="task-list-type-icon" />
        <span>{type}</span>
      </Space>
    )
  },
  {
    title: '优先级',
    dataIndex: 'priority',
    key: 'priority',
    width: 90,
    render: (priority: number) => (
      <Tag color={PRIORITY_COLORS[priority] ?? 'default'} className="task-list-priority-tag">
        {PRIORITY_LABELS[priority] ?? '未知'}
      </Tag>
    ),
    sorter: (a: Task, b: Task) => a.priority - b.priority
  },
  {
    title: 'Issue',
    key: 'issue',
    width: 180,
    render: renderIssueColumn
  },
  {
    title: 'PR',
    key: 'pr',
    width: 120,
    render: renderPRColumn
  },
  {
    title: 'CA',
    key: 'ca',
    width: 120,
    render: renderCAColumn
  },
  {
    title: '创建时间',
    dataIndex: 'createdAt',
    key: 'createdAt',
    width: 160,
    render: (timestamp: number) => (
      <Tooltip title={formatTimestamp(timestamp)}>
        <span className="task-list-time">{formatRelativeTime(timestamp)}</span>
      </Tooltip>
    ),
    sorter: (a: Task, b: Task) => a.createdAt - b.createdAt,
    defaultSortOrder: 'descend'
  },
  {
    title: '更新时间',
    dataIndex: 'updatedAt',
    key: 'updatedAt',
    width: 160,
    render: (timestamp: number) => (
      <Tooltip title={formatTimestamp(timestamp)}>
        <span className="task-list-time">{formatRelativeTime(timestamp)}</span>
      </Tooltip>
    ),
    sorter: (a: Task, b: Task) => a.updatedAt - b.updatedAt
  }
];

export const calculateStatusCounts = (tasks: Task[]) => {
  const counts = {
    all: tasks.length,
    queued: 0,
    running: 0,
    completed: 0,
    error: 0
  };
  tasks.forEach((task: Task) => {
    if (task.status === 'queued') {
      counts.queued++;
    } else if (RUNNING_STATUSES.includes(task.status)) {
      counts.running++;
    } else if (task.status === 'pr_merged') {
      counts.completed++;
    } else if (ERROR_STATUSES.includes(task.status)) {
      counts.error++;
    }
  });
  return counts;
};

export const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: '全部状态' },
  { value: 'queued', label: '排队中' },
  { value: 'running', label: '运行中' },
  { value: 'pr_merged', label: '已完成' },
  { value: 'error', label: '错误' }
];

export const PRIORITY_FILTER_OPTIONS = [
  { value: 'all', label: '全部优先级' },
  { value: PRIORITY_HIGH, label: '高' },
  { value: PRIORITY_MEDIUM, label: '中' },
  { value: PRIORITY_LOW, label: '低' }
];
