import { useState } from 'react';
import { Card, Button, Table, Space, Empty, Spin, Input, Modal, Form, message } from 'antd';
import { PlusOutlined, LinkOutlined, EditOutlined } from '@ant-design/icons';
import { useIssues, useCreateIssue } from '../../hooks/useIssues';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { Issue } from '../../types/issue';
import { formatDate, getIssueStatusTag } from '../../utils/formatters';

import './index.css';

interface CreateIssueFormData {
  issueId: number;
  issueUrl: string;
  issueTitle: string;
  issueContent?: string;
}

interface IssuesListProps {
  navigate: (path: string) => void;
  searchParams: URLSearchParams;
  setSearchParams: (params: {
    page: string;
    pageSize: string;
  }) => void;
  issues: Issue[];
  pagination?: { total: number };
  isLoading: boolean;
  createIssue: ReturnType<typeof useCreateIssue>;
}

const getIssueColumns = (navigate: (path: string) => void) => [
  {
    title: 'Issue ID',
    dataIndex: 'issueId',
    key: 'issueId',
    width: 120,
    render: (id: number) => <span className="issue-id">#{id}</span>
  },
  {
    title: '标题',
    dataIndex: 'issueTitle',
    key: 'issueTitle',
    ellipsis: true,
    render: (title: string, record: Issue) => (
      <a
        className="issue-title-link"
        onClick={() => navigate(`/issues/${record.id}`)}
      >
        {title}
      </a>
    )
  },
  {
    title: '状态',
    key: 'status',
    width: 120,
    render: (_: unknown, record: Issue) => getIssueStatusTag(record)
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
    render: (_: unknown, record: Issue) => (
      <Space size="small">
        <Button
          type="text"
          size="small"
          icon={<LinkOutlined />}
          onClick={() => window.open(record.issueUrl, '_blank')}
        >
          GitHub
        </Button>
        <Button
          type="text"
          size="small"
          icon={<EditOutlined />}
          onClick={() => navigate(`/issues/${record.id}`)}
        >
          详情
        </Button>
      </Space>
    )
  }
];

function IssuesListContent({
  navigate,
  searchParams,
  setSearchParams,
  issues,
  pagination,
  isLoading,
  createIssue
}: IssuesListProps) {
  const [searchText, setSearchText] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '10', 10);

  const handleSearch = (value: string) => {
    setSearchText(value);
  };

  const filteredIssues = issues.filter(
    (issue) =>
      issue.issueTitle.toLowerCase().includes(searchText.toLowerCase()) ||
      issue.issueId.toString().includes(searchText)
  );

  const handleTableChange = (newPage: number, newPageSize: number) => {
    setSearchParams({ page: newPage.toString(), pageSize: newPageSize.toString() });
  };

  const handleCreate = async (values: CreateIssueFormData) => {
    try {
      await createIssue.mutateAsync(values);
      setModalOpen(false);
      form.resetFields();
      message.success('创建成功');
    } catch (error) {
      console.error('Failed to create issue:', error);
      message.error('创建失败，请重试');
    }
  };

  const columns = getIssueColumns(navigate);

  if (isLoading) {
    return (
      <div className="issues-loading">
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  return (
    <div className="issues-list">
      <div className="issues-header">
        <div className="header-left">
          <h2>Issues 列表</h2>
          <span className="issue-count">共 {pagination?.total || 0} 个 Issue</span>
        </div>
        <Space>
          <Input.Search
            placeholder="搜索 Issue ID 或标题"
            allowClear
            style={{ width: 300 }}
            onSearch={handleSearch}
            onChange={(e) => setSearchText(e.target.value)}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
            添加 Issue
          </Button>
        </Space>
      </div>

      <Card className="issues-card">
        {filteredIssues.length === 0 ? (
          <Empty description="暂无 Issues" />
        ) : (
          <Table
            dataSource={filteredIssues}
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
        title="添加 Issue"
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
            name="issueId"
            label="Issue ID"
            rules={[{ required: true, message: '请输入 Issue ID' }]}
          >
            <Input type="number" placeholder="请输入 GitHub Issue ID" />
          </Form.Item>
          <Form.Item
            name="issueUrl"
            label="Issue URL"
            rules={[{ required: true, message: '请输入 Issue URL' }]}
          >
            <Input placeholder="https://github.com/..." />
          </Form.Item>
          <Form.Item
            name="issueTitle"
            label="Issue 标题"
            rules={[{ required: true, message: '请输入 Issue 标题' }]}
          >
            <Input placeholder="请输入 Issue 标题" />
          </Form.Item>
          <Form.Item name="issueContent" label="Issue 内容">
            <Input.TextArea rows={4} placeholder="请输入 Issue 内容" />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={createIssue.isPending}>
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

export function IssuesList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '10', 10);

  const { data, isLoading } = useIssues({ page, pageSize, orderBy: 'createdAt_desc' });
  const createIssue = useCreateIssue();

  const issues = data?.issues || [];
  const pagination = data?.pagination;

  return (
    <IssuesListContent
      navigate={navigate}
      searchParams={searchParams}
      setSearchParams={setSearchParams}
      issues={issues}
      pagination={pagination}
      isLoading={isLoading}
      createIssue={createIssue}
    />
  );
}
