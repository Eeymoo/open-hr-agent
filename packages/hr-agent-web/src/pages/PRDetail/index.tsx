import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Button, Descriptions, Space, Empty, Spin, Modal } from 'antd';
import { ArrowLeftOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { usePR } from '../../hooks/usePRs';
import { formatDate, getPRStatusTag } from '../../utils/formatters';
import './index.css';

export function PRDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const { data, isLoading } = usePR(parseInt(id || '0', 10));

  const pr = data;

  const handleDelete = async () => {
    setDeleteModalOpen(false);
    navigate('/prs');
  };

  if (isLoading) {
    return (
      <div className="pr-detail-loading">
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  if (!pr) {
    return <Empty description="Pull Request 不存在" />;
  }

  return (
    <div className="pr-detail">
      <div className="pr-detail-header">
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/prs')}>
          返回列表
        </Button>
        <Space>
          <Button type="primary" icon={<EditOutlined />} onClick={() => {}}>
            编辑
          </Button>
          <Button danger icon={<DeleteOutlined />} onClick={() => setDeleteModalOpen(true)}>
            删除
          </Button>
        </Space>
      </div>

      <Card className="pr-card">
        <div className="pr-card-header">
          <h1 className="pr-title">
            <span className="pr-number">#{pr.prId}</span> {pr.prTitle}
          </h1>
          <div className="pr-status">{getPRStatusTag(pr)}</div>
        </div>

        <Descriptions column={2} bordered className="pr-descriptions">
          <Descriptions.Item label="PR ID">{pr.prId}</Descriptions.Item>
          <Descriptions.Item label="状态">{getPRStatusTag(pr)}</Descriptions.Item>
          <Descriptions.Item label="创建时间">{formatDate(pr.createdAt)}</Descriptions.Item>
          <Descriptions.Item label="更新时间">{formatDate(pr.updatedAt)}</Descriptions.Item>
          {pr.completedAt > -1 && (
            <Descriptions.Item label="合并时间">{formatDate(pr.completedAt)}</Descriptions.Item>
          )}
          {pr.deletedAt > -1 && (
            <Descriptions.Item label="删除时间">{formatDate(pr.deletedAt)}</Descriptions.Item>
          )}
          {pr.issueId && (
            <Descriptions.Item label="关联 Issue" span={2}>
              <span className="issue-link">#{pr.issueId}</span>
            </Descriptions.Item>
          )}
        </Descriptions>

        {pr.prContent && (
          <div className="pr-content">
            <h3>内容</h3>
            <div className="pr-content-body">{pr.prContent}</div>
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
        <p>确定要删除这个 Pull Request 吗？此操作不可恢复。</p>
      </Modal>
    </div>
  );
}
