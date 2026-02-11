import { Modal, Descriptions, Tag, Tabs, Typography, Button } from 'antd';
import {
  GithubOutlined,
  LinkOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import {
  TASK_STATUS_LABELS,
  TASK_STATUS_COLORS,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
  type Task
} from '../../types/task';
import { formatTimestamp, formatDuration, TIMESTAMP_NEGATIVE_TWO } from '../../utils/formatters';

const { Paragraph } = Typography;

interface TaskModalProps {
  open: boolean;
  task: Task | null;
  onClose: () => void;
}

export function TaskModal({ open, task, onClose }: TaskModalProps) {
  if (!task) {
    return null;
  }

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

  const basicInfoTab = (
    <Descriptions column={1} bordered>
      <Descriptions.Item label="任务ID">#{task.id}</Descriptions.Item>
      <Descriptions.Item label="任务类型">{task.type}</Descriptions.Item>
      <Descriptions.Item label="状态">
        <Tag color={TASK_STATUS_COLORS[task.status]}>{TASK_STATUS_LABELS[task.status]}</Tag>
      </Descriptions.Item>
      <Descriptions.Item label="优先级">
        <Tag color={PRIORITY_COLORS[task.priority]}>{PRIORITY_LABELS[task.priority] || '其他'}</Tag>
      </Descriptions.Item>
      <Descriptions.Item label="创建时间">{formatTimestamp(task.createdAt)}</Descriptions.Item>
      <Descriptions.Item label="更新时间">{formatTimestamp(task.updatedAt)}</Descriptions.Item>
      {task.completedAt !== TIMESTAMP_NEGATIVE_TWO && (
        <Descriptions.Item label="完成时间">{formatTimestamp(task.completedAt)}</Descriptions.Item>
      )}
      {task.completedAt !== TIMESTAMP_NEGATIVE_TWO && task.createdAt !== TIMESTAMP_NEGATIVE_TWO && (
        <Descriptions.Item label="执行时长">
          {formatDuration(task.createdAt, task.completedAt)}
        </Descriptions.Item>
      )}
      {task.metadata && (
        <Descriptions.Item label="元数据">
          <pre>{JSON.stringify(task.metadata, null, 2)}</pre>
        </Descriptions.Item>
      )}
    </Descriptions>
  );

  const issueTab = task.issue ? (
    <Descriptions column={1} bordered>
      <Descriptions.Item label="Issue ID">#{task.issue.issueId}</Descriptions.Item>
      <Descriptions.Item label="标题">{task.issue.issueTitle}</Descriptions.Item>
      {task.issue.issueContent && (
        <Descriptions.Item label="内容">
          <Paragraph ellipsis={{ rows: 4, expandable: true }}>{task.issue.issueContent}</Paragraph>
        </Descriptions.Item>
      )}
      <Descriptions.Item label="链接">
        <Button type="primary" icon={<GithubOutlined />} onClick={handleIssueClick}>
          在 GitHub 上查看
        </Button>
      </Descriptions.Item>
    </Descriptions>
  ) : (
    <div style={{ textAlign: 'center', padding: '40px 0' }}>
      <CheckCircleOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />
      <p style={{ marginTop: 16, color: '#8c8c8c' }}>暂无关联的 Issue</p>
    </div>
  );

  const prTab = task.pullRequest ? (
    <Descriptions column={1} bordered>
      <Descriptions.Item label="PR ID">#{task.pullRequest.prId}</Descriptions.Item>
      <Descriptions.Item label="标题">{task.pullRequest.prTitle}</Descriptions.Item>
      {task.pullRequest.prContent && (
        <Descriptions.Item label="内容">
          <Paragraph ellipsis={{ rows: 4, expandable: true }}>
            {task.pullRequest.prContent}
          </Paragraph>
        </Descriptions.Item>
      )}
      <Descriptions.Item label="链接">
        <Button type="primary" icon={<GithubOutlined />} onClick={handlePRClick}>
          在 GitHub 上查看
        </Button>
      </Descriptions.Item>
    </Descriptions>
  ) : (
    <div style={{ textAlign: 'center', padding: '40px 0' }}>
      <ClockCircleOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />
      <p style={{ marginTop: 16, color: '#8c8c8c' }}>暂无关联的 Pull Request</p>
    </div>
  );

  const caTab = task.codingAgent ? (
    <Descriptions column={1} bordered>
      <Descriptions.Item label="CA ID">{task.codingAgent.id}</Descriptions.Item>
      <Descriptions.Item label="CA 名称">{task.codingAgent.caName}</Descriptions.Item>
      <Descriptions.Item label="容器ID">{task.codingAgent.containerId || '-'}</Descriptions.Item>
      <Descriptions.Item label="状态">
        <Tag color={task.codingAgent.status === 'idle' ? 'success' : 'processing'}>
          {task.codingAgent.status}
        </Tag>
      </Descriptions.Item>
      {task.codingAgent.dockerConfig && (
        <Descriptions.Item label="Docker 配置">
          <pre>{JSON.stringify(task.codingAgent.dockerConfig, null, 2)}</pre>
        </Descriptions.Item>
      )}
      <Descriptions.Item label="访问">
        <Button type="primary" icon={<LinkOutlined />} onClick={handleCAUrlClick}>
          打开 CA 界面
        </Button>
      </Descriptions.Item>
    </Descriptions>
  ) : (
    <div style={{ textAlign: 'center', padding: '40px 0' }}>
      <ClockCircleOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />
      <p style={{ marginTop: 16, color: '#8c8c8c' }}>暂无关联的 Coding Agent</p>
    </div>
  );

  const tabItems = [
    { key: 'basic', label: '基本信息', children: basicInfoTab },
    { key: 'issue', label: 'Issue 信息', children: issueTab },
    { key: 'pr', label: 'PR 信息', children: prTab },
    { key: 'ca', label: 'CA 信息', children: caTab }
  ];

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="close" type="primary" onClick={onClose}>
          关闭
        </Button>
      ]}
      width={800}
      title={`任务详情 #${task.id}`}
    >
      <Tabs defaultActiveKey="basic" items={tabItems} />
    </Modal>
  );
}
