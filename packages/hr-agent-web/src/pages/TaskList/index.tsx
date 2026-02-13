import { useState, useMemo } from 'react';
import { Card, Table, Space, Badge, Input, Select, Button } from 'antd';
import { ReloadOutlined, FilterOutlined } from '@ant-design/icons';
import { useTasks } from '../../hooks/useTasks';
import { useNavigate } from 'react-router-dom';
import { TASK_TAG_LABELS, type Task, type TaskStatus } from '../../types/task';
import {
  getTaskListColumns,
  calculateStatusCounts,
  isRunningStatus,
  STATUS_FILTER_OPTIONS,
  PRIORITY_FILTER_OPTIONS
} from './columns';
import './index.css';

const TAG_OPTIONS = Object.entries(TASK_TAG_LABELS).map(([value, label]) => ({
  value,
  label
}));

export function TaskList() {
  const navigate = useNavigate();
  const { data, isLoading, refetch } = useTasks();
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<number | 'all'>('all');
  const [filterTags, setFilterTags] = useState<string[]>([]);

  const tasks = useMemo(() => {
    return data?.tasks || [];
  }, [data?.tasks]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task: Task) => {
      const matchesSearch =
        !searchText ||
        task.id.toString().includes(searchText) ||
        task.type.toLowerCase().includes(searchText.toLowerCase()) ||
        (task.issue?.issueTitle?.toLowerCase().includes(searchText.toLowerCase()) ?? false);

      const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
      const matchesTags =
        filterTags.length === 0 || filterTags.some((tag) => task.tags?.includes(tag));

      return matchesSearch && matchesStatus && matchesPriority && matchesTags;
    });
  }, [tasks, searchText, statusFilter, priorityFilter, filterTags]);

  const columns = getTaskListColumns(navigate);
  const statusCounts = calculateStatusCounts(tasks);

  return (
    <div className="task-list-page">
      <TaskListHeader
        statusCounts={statusCounts}
        searchText={searchText}
        onSearchChange={setSearchText}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        priorityFilter={priorityFilter}
        onPriorityFilterChange={setPriorityFilter}
        filterTags={filterTags}
        onFilterTagsChange={setFilterTags}
        onRefresh={refetch}
      />
      <Card className="task-list-card">
        <Table
          dataSource={filteredTasks}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          scroll={{ x: 1400 }}
          pagination={{
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
            pageSizeOptions: ['10', '20', '50', '100']
          }}
          rowClassName={(record: Task) =>
            isRunningStatus(record.status) ? 'task-list-row-running' : ''
          }
        />
      </Card>
    </div>
  );
}

interface TaskListHeaderProps {
  statusCounts: {
    all: number;
    queued: number;
    running: number;
    completed: number;
    error: number;
  };
  searchText: string;
  onSearchChange: (value: string) => void;
  statusFilter: TaskStatus | 'all';
  onStatusFilterChange: (value: TaskStatus | 'all') => void;
  priorityFilter: number | 'all';
  onPriorityFilterChange: (value: number | 'all') => void;
  filterTags: string[];
  onFilterTagsChange: (value: string[]) => void;
  onRefresh: () => void;
}

function TaskListHeader({
  statusCounts,
  searchText,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  priorityFilter,
  onPriorityFilterChange,
  filterTags,
  onFilterTagsChange,
  onRefresh
}: TaskListHeaderProps) {
  return (
    <div className="task-list-header">
      <div className="task-list-header-left">
        <h2>任务列表</h2>
        <Space size={16} className="task-list-stats">
          <Badge status="default" text={`全部: ${statusCounts.all}`} />
          <Badge status="processing" text={`运行中: ${statusCounts.running}`} />
          <Badge status="success" text={`已完成: ${statusCounts.completed}`} />
          <Badge status="error" text={`错误: ${statusCounts.error}`} />
        </Space>
      </div>
      <div className="task-list-header-right">
        <Input.Search
          placeholder="搜索 ID、类型或 Issue 标题"
          value={searchText}
          onChange={(e) => onSearchChange(e.target.value)}
          style={{ width: 280 }}
          allowClear
        />
        <div className="filter-container">
          <FilterOutlined className="filter-icon" />
          <Select
            mode="multiple"
            allowClear
            placeholder="筛选标签"
            value={filterTags}
            onChange={onFilterTagsChange}
            options={TAG_OPTIONS}
            className="tag-filter"
            maxTagCount="responsive"
          />
        </div>
        <Select
          value={statusFilter}
          onChange={onStatusFilterChange}
          style={{ width: 140 }}
          options={STATUS_FILTER_OPTIONS}
        />
        <Select
          value={priorityFilter}
          onChange={onPriorityFilterChange}
          style={{ width: 120 }}
          options={PRIORITY_FILTER_OPTIONS}
        />
        <Button
          icon={<ReloadOutlined />}
          onClick={() => {
            onRefresh();
          }}
        >
          刷新
        </Button>
      </div>
    </div>
  );
}
