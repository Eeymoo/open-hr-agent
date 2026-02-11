import { useState } from 'react';
import {
  Card,
  Button,
  Table,
  Space,
  Empty,
  Spin,
  Input,
  Modal,
  Form,
  message,
  Tag,
  Drawer
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CodeOutlined,
  HistoryOutlined
} from '@ant-design/icons';
import {
  useCodingAgents,
  useCreateCodingAgent,
  useUpdateCodingAgent,
  useDeleteCodingAgent
} from '../../hooks/useCAs';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { formatDate } from '../../utils/formatters';
import type {
  CodingAgent,
  CodingAgentLog,
  CA_STATUS_LABELS,
  CA_STATUS_COLORS
} from '../../types/ca';

import './index.css';

interface CreateCAFormData {
  caName: string;
  status?: string;
  dockerConfig?: Record<string, unknown>;
}

interface CAsListProps {
  navigate: (path: string) => void;
  searchParams: URLSearchParams;
  setSearchParams: (params: { page: string; pageSize: string }) => void;
  cas: CodingAgent[];
  pagination?: { total: number };
  isLoading: boolean;
  createCA: ReturnType<typeof useCreateCodingAgent>;
  updateCA: ReturnType<typeof useUpdateCodingAgent>;
  deleteCA: ReturnType<typeof useDeleteCodingAgent>;
}

const getCAColumns = (
  navigate: (path: string) => void,
  onOpenProxy: (ca: CodingAgent) => void,
  onEdit: (ca: CodingAgent) => void,
  onDelete: (ca: CodingAgent) => void,
  onViewLogs: (ca: CodingAgent) => void
) => [
  {
    title: 'ID',
    dataIndex: 'id',
    key: 'id',
    width: 80
  },
  {
    title: '名称',
    dataIndex: 'caName',
    key: 'caName',
    width: 150
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: 120,
    render: (status: string) => (
      <Tag color={CA_STATUS_COLORS[status as keyof typeof CA_STATUS_COLORS]}>
        {CA_STATUS_LABELS[status as keyof typeof CA_STATUS_LABELS]}
      </Tag>
    )
  },
  {
    title: '容器 ID',
    dataIndex: 'containerId',
    key: 'containerId',
    width: 200,
    ellipsis: true,
    render: (containerId: string | null) => containerId || '-'
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
    width: 250,
    render: (_: unknown, record: CodingAgent) => (
      <Space size="small">
        <Button
          type="text"
          size="small"
          icon={<CodeOutlined />}
          onClick={() => onOpenProxy(record)}
          disabled={!record.containerId}
        >
          打开
        </Button>
        <Button
          type="text"
          size="small"
          icon={<HistoryOutlined />}
          onClick={() => onViewLogs(record)}
        >
          日志
        </Button>
        <Button type="text" size="small" icon={<EditOutlined />} onClick={() => onEdit(record)}>
          编辑
        </Button>
        <Button
          type="text"
          size="small"
          danger
          icon={<DeleteOutlined />}
          onClick={() => onDelete(record)}
        >
          删除
        </Button>
      </Space>
    )
  }
];

// eslint-disable-next-line max-lines-per-function
function CAsListContent({
  navigate,
  searchParams,
  setSearchParams,
  cas,
  pagination,
  isLoading,
  createCA,
  updateCA,
  deleteCA
}: CAsListProps) {
  const [searchText, setSearchText] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [logsDrawerOpen, setLogsDrawerOpen] = useState(false);
  const [selectedCA, setSelectedCA] = useState<CodingAgent | null>(null);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();

  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '10', 10);

  const handleSearch = (value: string) => {
    setSearchText(value);
  };

  const filteredCAs = cas.filter(
    (ca) =>
      ca.caName.toLowerCase().includes(searchText.toLowerCase()) ||
      ca.id.toString().includes(searchText)
  );

  const handleTableChange = (newPage: number, newPageSize: number) => {
    setSearchParams({ page: newPage.toString(), pageSize: newPageSize.toString() });
  };

  const handleCreate = async (values: CreateCAFormData) => {
    try {
      await createCA.mutateAsync(values);
      setModalOpen(false);
      form.resetFields();
      message.success('创建成功');
    } catch (error) {
      console.error('Failed to create CA:', error);
      message.error('创建失败，请重试');
    }
  };

  const handleUpdate = async (values: Partial<CodingAgent>) => {
    if (!selectedCA) {
      return;
    }
    try {
      await updateCA.mutateAsync({ id: selectedCA.id, data: values });
      setEditModalOpen(false);
      editForm.resetFields();
      setSelectedCA(null);
      message.success('更新成功');
    } catch (error) {
      console.error('Failed to update CA:', error);
      message.error('更新失败，请重试');
    }
  };

  const handleDelete = async (ca: CodingAgent) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除 Coding Agent "${ca.caName}" 吗？`,
      onOk: async () => {
        try {
          await deleteCA.mutateAsync(ca.id);
          message.success('删除成功');
        } catch (error) {
          console.error('Failed to delete CA:', error);
          message.error('删除失败，请重试');
        }
      }
    });
  };

  const handleOpenProxy = (ca: CodingAgent) => {
    if (ca.containerId) {
      window.open(`/ca/${ca.caName}/`, '_blank');
    }
  };

  const handleEdit = (ca: CodingAgent) => {
    setSelectedCA(ca);
    editForm.setFieldsValue({
      status: ca.status,
      containerId: ca.containerId
    });
    setEditModalOpen(true);
  };

  const handleViewLogs = (ca: CodingAgent) => {
    setSelectedCA(ca);
    setLogsDrawerOpen(true);
  };

  const columns = getCAColumns(navigate, handleOpenProxy, handleEdit, handleDelete, handleViewLogs);

  if (isLoading) {
    return (
      <div className="cas-loading">
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  return (
    <div className="cas-list">
      <div className="cas-header">
        <div className="header-left">
          <h2>Coding Agents 列表</h2>
          <span className="ca-count">共 {pagination?.total || 0} 个 Coding Agent</span>
        </div>
        <Space>
          <Input.Search
            placeholder="搜索 ID 或名称"
            allowClear
            style={{ width: 300 }}
            onSearch={handleSearch}
            onChange={(e) => setSearchText(e.target.value)}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
            添加 CA
          </Button>
        </Space>
      </div>

      <Card className="cas-card">
        {filteredCAs.length === 0 ? (
          <Empty description="暂无 Coding Agents" />
        ) : (
          <Table
            dataSource={filteredCAs}
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
        title="添加 Coding Agent"
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="caName" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="请输入 CA 名称" />
          </Form.Item>
          <Form.Item name="status" label="状态" initialValue="pending">
            <Input placeholder="pending, running, idle, error, etc." />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={createCA.isPending}>
                提交
              </Button>
              <Button onClick={() => setModalOpen(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="编辑 Coding Agent"
        open={editModalOpen}
        onCancel={() => {
          setEditModalOpen(false);
          editForm.resetFields();
          setSelectedCA(null);
        }}
        footer={null}
        width={600}
      >
        <Form form={editForm} layout="vertical" onFinish={handleUpdate}>
          <Form.Item name="status" label="状态" rules={[{ required: true, message: '请输入状态' }]}>
            <Input placeholder="pending, running, idle, error, etc." />
          </Form.Item>
          <Form.Item name="containerId" label="容器 ID">
            <Input placeholder="请输入容器 ID" />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={updateCA.isPending}>
                提交
              </Button>
              <Button onClick={() => setEditModalOpen(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title={`${selectedCA?.caName} - 操作日志`}
        placement="right"
        width={600}
        open={logsDrawerOpen}
        onClose={() => {
          setLogsDrawerOpen(false);
          setSelectedCA(null);
        }}
      >
        {selectedCA?.logs && selectedCA.logs.length > 0 ? (
          <div className="ca-logs">
            {selectedCA.logs.map((log: CodingAgentLog) => (
              <div key={log.id} className="ca-log-item">
                <div className="log-header">
                  <Tag>{log.action}</Tag>
                  <span className="log-time">{formatDate(log.createdAt)}</span>
                </div>
                {log.oldValue && (
                  <div className="log-field">
                    <span className="field-label">旧值:</span>
                    <span className="field-value">{log.oldValue}</span>
                  </div>
                )}
                {log.newValue && (
                  <div className="log-field">
                    <span className="field-label">新值:</span>
                    <span className="field-value">{log.newValue}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <Empty description="暂无操作日志" />
        )}
      </Drawer>
    </div>
  );
}

export function CAsList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '10', 10);

  const { data, isLoading } = useCodingAgents({ page, pageSize, orderBy: 'createdAt_desc' });
  const createCA = useCreateCodingAgent();
  const updateCA = useUpdateCodingAgent();
  const deleteCA = useDeleteCodingAgent();

  const cas = data?.cas || [];
  const pagination = data?.pagination;

  return (
    <CAsListContent
      navigate={navigate}
      searchParams={searchParams}
      setSearchParams={setSearchParams}
      cas={cas}
      pagination={pagination}
      isLoading={isLoading}
      createCA={createCA}
      updateCA={updateCA}
      deleteCA={deleteCA}
    />
  );
}
