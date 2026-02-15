import { useState, useMemo } from 'react';
import { Row, Col, Select, Space, Empty, Card } from 'antd';
import { FilterOutlined, DashboardOutlined } from '@ant-design/icons';
import { TaskKanban } from '../../components/TaskKanban';
import { useTasks } from '../../hooks/useTasks';
import { TASK_TAG_LABELS, type Task } from '../../types/task';
import { TaskOverview, IssueOverview, PrOverview, CaOverview } from '../../components/DashboardOverview';
import { Page } from '../../components/Page';
import './index.css';

const DEFAULT_FILTER_TAGS = ['requires:ca', 'agent:coding', 'agent:review', 'agent:test'];

const TAG_OPTIONS = Object.entries(TASK_TAG_LABELS).map(([value, label]) => ({
  value,
  label
}));

const KANBAN_PAGE_SIZE = 50;

export function Dashboard() {
  const [filterTags, setFilterTags] = useState<string[]>(DEFAULT_FILTER_TAGS);

  const { data, isLoading } = useTasks({
    pageSize: KANBAN_PAGE_SIZE,
    tags: filterTags.length > 0 ? filterTags : undefined
  });

  const tasks = useMemo(() => data?.tasks || [], [data?.tasks]);

  const handleTaskClick = (task: Task) => {
    console.log('Task clicked:', task);
  };

  return (
    <Page loading={isLoading}>
      <div className="dashboard-page">
        <OverviewSection />
        <TaskQueueSection
          tasks={tasks}
          filterTags={filterTags}
          onFilterTagsChange={setFilterTags}
          onTaskClick={handleTaskClick}
        />
      </div>
    </Page>
  );
}

function OverviewSection() {
  return (
    <div className="dashboard-overview-section">
      <h2 className="dashboard-section-title">
        <DashboardOutlined /> 系统概览
      </h2>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <TaskOverview />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <IssueOverview />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <PrOverview />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <CaOverview />
        </Col>
      </Row>
    </div>
  );
}

interface TaskQueueSectionProps {
  tasks: Task[];
  filterTags: string[];
  onFilterTagsChange: (tags: string[]) => void;
  onTaskClick: (task: Task) => void;
}

function TaskQueueSection({ tasks, filterTags, onFilterTagsChange }: TaskQueueSectionProps) {
  return (
    <div className="dashboard-queue-section">
      <div className="dashboard-queue-header">
        <h2 className="dashboard-section-title">任务队列</h2>
        <Space>
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
        </Space>
      </div>
      <Card className="dashboard-queue-card">
        {tasks.length === 0 ? (
          <Empty description="暂无任务" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <TaskKanban
            tasks={tasks}
            onTaskClick={() => {}}
            onEdit={() => {}}
            onDelete={() => {}}
          />
        )}
      </Card>
    </div>
  );
}
