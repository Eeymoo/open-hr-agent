import { useState, useMemo } from 'react';
import { Card, Table, Space, Badge, Input, Select, Button } from 'antd';
import type { TablePaginationConfig } from 'antd/es/table';
import { ReloadOutlined, FilterOutlined } from '@ant-design/icons';
import { useTasks } from '../../hooks/useTasks';
import { useNavigate } from 'react-router-dom';
import {
  TASK_TAG_LABELS,
  type Task,
  type TaskStatus,
  type TaskQueryParams
} from '../../types/task';
import {
  getTaskListColumns,
  isRunningStatus,
  STATUS_FILTER_OPTIONS,
  PRIORITY_FILTER_OPTIONS
} from './columns';
import { Page } from '../../components/Page';
import './index.css';

const DEFAULT_FILTER_TAGS = ['requires:ca', 'agent:coding', 'agent:review', 'agent:test'];

const TAG_OPTIONS = Object.entries(TASK_TAG_LABELS).map(([value, label]) => ({
  value,
  label
}));

const DEFAULT_PAGE_SIZE = 10;

export function TaskList() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<number | 'all'>('all');
  const [filterTags, setFilterTags] = useState<string[]>(DEFAULT_FILTER_TAGS);

  const queryParams: TaskQueryParams = useMemo(() => {
    const params: TaskQueryParams = {
      page,
      pageSize,
      tags: filterTags.length > 0 ? filterTags : undefined
    };
    if (statusFilter !== 'all') {
      params.status = statusFilter;
    }
    if (priorityFilter !== 'all') {
      params.priority = priorityFilter;
    }
    return params;
  }, [page, pageSize, filterTags, statusFilter, priorityFilter]);

  const { data, isLoading, refetch } = useTasks(queryParams);

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

      return matchesSearch;
    });
  }, [tasks, searchText]);

  const columns = getTaskListColumns(navigate);

  const handleTableChange = (pagination: TablePaginationConfig) => {
    if (pagination.current) {
      setPage(pagination.current);
    }
    if (pagination.pageSize) {
      setPageSize(pagination.pageSize);
    }
  };

  return (
    <Page loading={isLoading}>
      <div className="task-list-page">
        <TaskListHeader
          total={data?.pagination?.total || 0}
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
            scroll={{ x: 1400 }}
            pagination={{
              current: page,
              pageSize,
              total: data?.pagination?.total || 0,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条`,
              pageSizeOptions: ['10', '20', '50', '100']
            }}
            onChange={handleTableChange}
            rowClassName={(record: Task) =>
              isRunningStatus(record.status) ? 'task-list-row-running' : ''
            }
          />
        </Card>
      </div>
    </Page>
  );
}

interface TaskListHeaderProps {
  total: number;
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
  total,
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
          <Badge status="default" text={`全部: ${total}`} />
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
