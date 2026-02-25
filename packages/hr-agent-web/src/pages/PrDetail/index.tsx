import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Button, Descriptions, Space, Empty, Modal, message, theme } from 'antd';
import { ArrowLeftOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { usePR, useDeletePR } from '../../hooks/usePrs';
import { formatDate, getPRStatusTag } from '../../utils/formatters';
import { Page } from '../../components/Page';

export function PRDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const { token } = theme.useToken();

  const { data, isLoading } = usePR(parseInt(id || '0', 10));
  const deletePR = useDeletePR();

  const pr = data;

  const handleDelete = async () => {
    try {
      await deletePR.mutateAsync(pr?.id ?? 0);
      message.success('删除成功');
      setDeleteModalOpen(false);
      navigate('/prs');
    } catch (error) {
      console.error('Failed to delete PR:', error);
      message.error('删除失败，请重试');
    }
  };

  return (
    <Page loading={isLoading}>
      {!pr ? (
        <Empty description="Pull Request 不存在" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
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

          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, paddingBottom: 20, borderBottom: `1px solid ${token.colorBorder}` }}>
              <h1 style={{ margin: 0, fontSize: 26, fontWeight: 600 }}>
                <span style={{ fontFamily: 'monospace' }}>#{pr.prId}</span> {pr.prTitle}
              </h1>
              <div style={{ flexShrink: 0 }}>{getPRStatusTag(pr)}</div>
            </div>

            <Descriptions column={2} bordered style={{ marginBottom: 28 }}>
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
                  <span style={{ fontFamily: 'monospace' }}>#{pr.issueId}</span>
                </Descriptions.Item>
              )}
            </Descriptions>

            {pr.prContent && (
              <div style={{ marginTop: 28, paddingTop: 24, borderTop: `1px solid ${token.colorBorder}` }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 600 }}>内容</h3>
                <div
                  style={{
                    padding: 20,
                    background: token.colorBgLayout,
                    border: `1px solid ${token.colorBorder}`,
                    borderRadius: 8,
                    lineHeight: 1.7,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                  }}
                >
                  {pr.prContent}
                </div>
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
      )}
    </Page>
  );
}
