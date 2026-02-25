import { useState, useMemo } from 'react';
import { Row, Col, Select, Space, Empty, Card, Typography } from 'antd';
import { FilterOutlined, DashboardOutlined } from '@ant-design/icons';
import { TaskKanban } from '../../components/TaskKanban';
import { useTasks } from '../../hooks/useTasks';
import { TASK_TAG_LABELS, type Task } from '../../types/task';
import { TaskOverview, IssueOverview, PrOverview, CaOverview } from '../../components/DashboardOverview';
import { Page } from '../../components/Page';

const { Title } = Typography;

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
      <Space direction="vertical" size={24} style={{ width: '100%' }}>
        <OverviewSection />
        <TaskQueueSection
          tasks={tasks}
          filterTags={filterTags}
          onFilterTagsChange={setFilterTags}
          onTaskClick={handleTaskClick}
        />
      </Space>
    </Page>
  );
}

function OverviewSection() {
  return (
    <Card>
      <Title level={4} style={{ marginBottom: 16 }}>
        <DashboardOutlined style={{ marginRight: 8 }} /> 系统概览
      </Title>
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
    </Card>
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
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={4} style={{ margin: 0 }}>任务队列</Title>
          <Space>
            <FilterOutlined />
            <Select
              mode="multiple"
              allowClear
              placeholder="筛选标签"
              value={filterTags}
              onChange={onFilterTagsChange}
              options={TAG_OPTIONS}
              style={{ minWidth: 200 }}
              maxTagCount="responsive"
            />
          </Space>
        </div>
      </Card>
      <Card>
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
    </Space>
  );
}
