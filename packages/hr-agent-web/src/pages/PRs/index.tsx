import { useState } from 'react';
import { Card, Button, Table, Space, Empty, Spin, Input, Modal, Form } from 'antd';
import { PlusOutlined, LinkOutlined } from '@ant-design/icons';
import { usePRs, useCreatePR } from '../../hooks/usePRs';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { PullRequest } from '../../types/pr';
import { formatDate, getPRStatusTag } from '../../utils/formatters';

import './index.css';

interface CreatePRFormData {
  prId: number;
  prTitle: string;
  prContent?: string;
  issueId?: number;
}

interface PRsListProps {
  navigate: (path: string) => void;
  searchParams: URLSearchParams;
  setSearchParams: (params: {
    page: string;
    pageSize: string;
  }) => void;
  prs: PullRequest[];
  pagination?: { total: number };
  isLoading: boolean;
  createPR: ReturnType<typeof useCreatePR>;
}

const getPRColumns = (navigate: (path: string) => void) => [
  {
    title: 'PR ID',
    dataIndex: 'prId',
    key: 'prId',
    width: 120,
    render: (id: number) => <span className="pr-id">#{id}</span>
  },
  {
    title: '标题',
    dataIndex: 'prTitle',
    key: 'prTitle',
    ellipsis: true,
    render: (title: string, record: PullRequest) => (
      <a className="pr-title-link" onClick={() => navigate(`/prs/${record.id}`)}>
        {title}
      </a>
    )
  },
  {
    title: '关联 Issue',
    dataIndex: 'issueId',
    key: 'issueId',
    width: 120,
    render: (id: number | undefined) =>
      id ? <span className="issue-id">#{id}</span> : <span className="no-issue">-</span>
  },
  {
    title: '状态',
    key: 'status',
    width: 120,
    render: (_: unknown, record: PullRequest) => getPRStatusTag(record)
  },
  {
    title: '创建时间',
    dataIndex: 'createdAt',
    key: 'createdAt',
    width: 180,
    render: formatDate
  },
  {
    title: '更新时间',
    dataIndex: 'updatedAt',
    key: 'updatedAt',
    width: 180,
    render: formatDate
  },
  {
    title: '操作',
    key: 'actions',
    width: 150,
    render: (_: unknown, record: PullRequest) => (
      <Space size="small">
        <Button
          type="text"
          size="small"
          icon={<LinkOutlined />}
          onClick={() => navigate(`/prs/${record.id}`)}
        >
          详情
        </Button>
      </Space>
    )
  }
];

function PRsListContent({
  navigate,
  searchParams,
  setSearchParams,
  prs,
  pagination,
  isLoading,
  createPR
}: PRsListProps) {
  const [searchText, setSearchText] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '10', 10);

  const handleSearch = (value: string) => {
    setSearchText(value);
  };

  const filteredPRs = prs.filter(
    (pr) =>
      pr.prTitle.toLowerCase().includes(searchText.toLowerCase()) ||
      pr.prId.toString().includes(searchText)
  );

  const handleTableChange = (newPage: number, newPageSize: number) => {
    setSearchParams({ page: newPage.toString(), pageSize: newPageSize.toString() });
  };

  const handleCreate = async (values: CreatePRFormData) => {
    try {
      await createPR.mutateAsync(values);
      setModalOpen(false);
      form.resetFields();
    } catch (error) {
      console.error('Failed to create PR:', error);
    }
  };

  const columns = getPRColumns(navigate);

  if (isLoading) {
    return (
      <div className="prs-loading">
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  return (
    <div className="prs-list">
      <div className="prs-header">
        <div className="header-left">
          <h2>Pull Requests 列表</h2>
          <span className="pr-count">共 {pagination?.total || 0} 个 PR</span>
        </div>
        <Space>
          <Input.Search
            placeholder="搜索 PR ID 或标题"
            allowClear
            style={{ width: 300 }}
            onSearch={handleSearch}
            onChange={(e) => setSearchText(e.target.value)}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
            添加 PR
          </Button>
        </Space>
      </div>

      <Card className="prs-card">
        {filteredPRs.length === 0 ? (
          <Empty description="暂无 Pull Requests" />
        ) : (
          <Table
            dataSource={filteredPRs}
            columns={columns}
            rowKey="id"
            pagination={{
              current: page,
              pageSize,
              total: pagination?.total || 0,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条`,
              onChange: handleTableChange
            }}
          />
        )}
      </Card>

      <Modal
        title="添加 Pull Request"
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item
            name="prId"
            label="PR ID"
            rules={[{ required: true, message: '请输入 PR ID' }]}
          >
            <Input type="number" placeholder="请输入 GitHub PR ID" />
          </Form.Item>
          <Form.Item
            name="prTitle"
            label="PR 标题"
            rules={[{ required: true, message: '请输入 PR 标题' }]}
          >
            <Input placeholder="请输入 PR 标题" />
          </Form.Item>
          <Form.Item name="issueId" label="关联 Issue ID">
            <Input type="number" placeholder="请输入关联的 Issue ID（可选）" />
          </Form.Item>
          <Form.Item name="prContent" label="PR 内容">
            <Input.TextArea rows={4} placeholder="请输入 PR 内容" />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={createPR.isPending}>
                提交
              </Button>
              <Button onClick={() => setModalOpen(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export function PRsList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '10', 10);

  const { data, isLoading } = usePRs({ page, pageSize, orderBy: 'createdAt_desc' });
  const createPR = useCreatePR();

  const prs = data?.prs || [];
  const pagination = data?.pagination;

  return (
    <PRsListContent
      navigate={navigate}
      searchParams={searchParams}
      setSearchParams={setSearchParams}
      prs={prs}
      pagination={pagination}
      isLoading={isLoading}
      createPR={createPR}
    />
  );
}
