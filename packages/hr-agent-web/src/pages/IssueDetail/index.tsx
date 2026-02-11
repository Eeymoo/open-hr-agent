import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Button, Descriptions, Space, Empty, Spin, message, Modal } from 'antd';
import { ArrowLeftOutlined, EditOutlined, LinkOutlined, DeleteOutlined } from '@ant-design/icons';
import { useIssue, useDeleteIssue } from '../../hooks/useIssues';
import { formatDate, getIssueStatusTag } from '../../utils/formatters';
import './index.css';

export function IssueDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const { data, isLoading } = useIssue(parseInt(id || '0', 10));
  const deleteIssue = useDeleteIssue();

  const issue = data;

  const handleDelete = async () => {
    try {
      await deleteIssue.mutateAsync(issue?.id ?? 0);
      message.success('删除成功');
      setDeleteModalOpen(false);
      navigate('/issues');
    } catch (error) {
      console.error('Failed to delete issue:', error);
      message.error('删除失败，请重试');
    }
  };

  if (isLoading) {
    return (
      <div className="issue-detail-loading">
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  if (!issue) {
    return <Empty description="Issue 不存在" />;
  }

  return (
    <div className="issue-detail">
      <div className="issue-detail-header">
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/issues')}>
          返回列表
        </Button>
        <Space>
          <Button icon={<LinkOutlined />} onClick={() => window.open(issue.issueUrl, '_blank')}>
            GitHub 链接
          </Button>
          <Button type="primary" icon={<EditOutlined />} onClick={() => {}}>
            编辑
          </Button>
          <Button danger icon={<DeleteOutlined />} onClick={() => setDeleteModalOpen(true)}>
            删除
          </Button>
        </Space>
      </div>

      <Card className="issue-card">
        <div className="issue-card-header">
          <h1 className="issue-title">
            <span className="issue-number">#{issue.issueId}</span> {issue.issueTitle}
          </h1>
          <div className="issue-status">{getIssueStatusTag(issue)}</div>
        </div>

        <Descriptions column={2} bordered className="issue-descriptions">
          <Descriptions.Item label="Issue ID">{issue.issueId}</Descriptions.Item>
          <Descriptions.Item label="状态">{getIssueStatusTag(issue)}</Descriptions.Item>
          <Descriptions.Item label="创建时间">{formatDate(issue.createdAt)}</Descriptions.Item>
          <Descriptions.Item label="更新时间">{formatDate(issue.updatedAt)}</Descriptions.Item>
          {issue.completedAt > -1 && (
            <Descriptions.Item label="完成时间">{formatDate(issue.completedAt)}</Descriptions.Item>
          )}
          {issue.deletedAt > -1 && (
            <Descriptions.Item label="删除时间">{formatDate(issue.deletedAt)}</Descriptions.Item>
          )}
          <Descriptions.Item label="GitHub URL" span={2}>
            <a href={issue.issueUrl} target="_blank" rel="noopener noreferrer">
              {issue.issueUrl}
            </a>
          </Descriptions.Item>
        </Descriptions>

        {issue.issueContent && (
          <div className="issue-content">
            <h3>内容</h3>
            <div className="issue-content-body">{issue.issueContent}</div>
          </div>
        )}
      </Card>

      <Modal
        title="确认删除"
        open={deleteModalOpen}
        onOk={handleDelete}
        onCancel={() => setDeleteModalOpen(false)}
        okText="确认"
        cancelText="取消"
        okButtonProps={{ danger: true }}
      >
        <p>确定要删除这个 Issue 吗？此操作不可恢复。</p>
      </Modal>
    </div>
  );
}
