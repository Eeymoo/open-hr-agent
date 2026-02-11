import { useEffect, useState } from 'react';
import { Spin, Tag } from 'antd';
import { useTasks } from '../../hooks/useTasks';
import { TASK_STATUS_LABELS, TASK_STATUS_COLORS, type Task, type TaskQueryParams } from '../../types/task';
import { formatTimestamp } from '../../utils/formatters';
import './index.css';

interface TaskTableProps {
  params?: TaskQueryParams;
  onTaskClick?: (task: Task) => void;
}

export function TaskTable({ params, onTaskClick }: TaskTableProps) {
  const { data, isLoading } = useTasks(params);
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    if (data?.tasks) {
      setTasks(data.tasks);
    }
  }, [data]);

  const columns = [
    { prop: 'id', name: 'ID', size: 80 },
    { prop: 'type', name: '类型', size: 150 },
    { prop: 'status', name: '状态', size: 120 },
    { prop: 'priority', name: '优先级', size: 100 },
    { prop: 'issue', name: 'Issue', size: 100 },
    { prop: 'pr', name: 'PR', size: 100 },
    { prop: 'ca', name: 'CA', size: 120 },
    { prop: 'createdAt', name: '创建时间', size: 180 },
    { prop: 'updatedAt', name: '更新时间', size: 180 }
  ];

  // eslint-disable-next-line complexity
  const formatCellValue = (prop: string, row: Task) => {
    const value = row[prop as keyof Task];

    switch (prop) {
      case 'status':
        return (
          <Tag color={TASK_STATUS_COLORS[value as keyof typeof TASK_STATUS_COLORS]}>
            {TASK_STATUS_LABELS[value as keyof typeof TASK_STATUS_LABELS] || (value as string)}
          </Tag>
        );
      case 'priority':
        return value?.toString() ?? '-';
      case 'issue':
        return row.issue ? `#${row.issue.issueId}` : '-';
      case 'pr':
        return row.pullRequest ? `#${row.pullRequest.prId}` : '-';
      case 'ca':
        return row.codingAgent ? row.codingAgent.caName : '-';
      case 'createdAt':
      case 'updatedAt':
        return formatTimestamp(value as number);
      default:
        if (value === undefined || value === null) {
          return '-';
        }
        if (typeof value === 'string' || typeof value === 'number') {
          return value.toString();
        }
        return '-';
    }
  };

  const handleRowClick = (task: Task) => {
    if (onTaskClick) {
      onTaskClick(task);
    }
  };

  if (isLoading) {
    return (
      <div className="task-table-container">
        <div className="task-table-loading">
          <Spin size="large" tip="加载中..." />
        </div>
      </div>
    );
  }

  return (
    <div className="task-table-container">
      <div className="task-table">
        <table>
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.prop} style={{ width: col.size }}>
                  {col.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr key={task.id} onClick={() => handleRowClick(task)} className="task-row">
                {columns.map((col) => (
                  <td key={col.prop}>
                    {formatCellValue(col.prop, task)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data?.pagination && (
        <div className="task-pagination">
          <span>
            共 {data.pagination.total} 条记录，第 {data.pagination.page} /{' '}
            {data.pagination.totalPages} 页
          </span>
        </div>
      )}
    </div>
  );
}