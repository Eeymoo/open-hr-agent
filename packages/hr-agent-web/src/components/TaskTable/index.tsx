import { useEffect, useState } from 'react';
import { Spin, Tag, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useTasks } from '../../hooks/useTasks';
import {
  TASK_STATUS_LABELS,
  TASK_STATUS_COLORS,
  type Task,
  type TaskQueryParams
} from '../../types/task';
import { formatTimestamp } from '../../utils/formatters';

interface TaskTableProps {
  params?: TaskQueryParams;
  onTaskClick?: (_task: Task) => void;
}

export function TaskTable({ params, onTaskClick }: TaskTableProps) {
  const { data, isLoading } = useTasks(params);
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    if (data?.tasks) {
      setTasks(data.tasks);
    }
  }, [data]);

  const columns: ColumnsType<Task> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      render: (id: number) => `#${id}`
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 150
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => (
        <Tag color={TASK_STATUS_COLORS[status as keyof typeof TASK_STATUS_COLORS]}>
          {TASK_STATUS_LABELS[status as keyof typeof TASK_STATUS_LABELS] || status}
        </Tag>
      )
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 100,
      render: (priority: number) => priority?.toString() ?? '-'
    },
    {
      title: 'Issue',
      key: 'issue',
      width: 100,
      render: (_: unknown, record: Task) => (record.issue ? `#${record.issue.issueId}` : '-')
    },
    {
      title: 'PR',
      key: 'pr',
      width: 100,
      render: (_: unknown, record: Task) =>
        record.pullRequest ? `#${record.pullRequest.prId}` : '-'
    },
    {
      title: 'CA',
      key: 'ca',
      width: 120,
      render: (_: unknown, record: Task) =>
        record.codingAgent ? record.codingAgent.caName : '-'
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (timestamp: number) => formatTimestamp(timestamp)
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 180,
      render: (timestamp: number) => formatTimestamp(timestamp)
    }
  ];

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 48 }}>
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  return (
    <div>
      <Table
        dataSource={tasks}
        columns={columns}
        rowKey="id"
        onRow={(record) => ({
          onClick: () => onTaskClick?.(record),
          style: { cursor: onTaskClick ? 'pointer' : 'default' }
        })}
        pagination={false}
      />
      {data?.pagination && (
        <div style={{ marginTop: 16, color: '#8c8c8c' }}>
          共 {data.pagination.total} 条记录，第 {data.pagination.page} /{' '}
          {data.pagination.totalPages} 页
        </div>
      )}
    </div>
  );
}
