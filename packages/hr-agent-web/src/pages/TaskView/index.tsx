import { useState } from 'react';
import { Radio, Space, Empty, Spin, Row, Col, Card, Statistic } from 'antd';
import { TableOutlined, AppstoreOutlined } from '@ant-design/icons';
import { TaskKanban } from '../../components/TaskKanban';
import { TaskTable } from '../../components/TaskTable';
import { TaskModal } from '../../components/TaskModal';
import { useTasks } from '../../hooks/useTasks';
import type { Task } from '../../types/task';
import './index.css';

type ViewMode = 'kanban' | 'table';

export function TaskView() {
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const { data, isLoading } = useTasks();
  const tasks = data?.tasks || [];

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setDetailModalOpen(true);
  };

  const handleEditTask = (_task: Task) => {
    console.log('Edit task:', _task);
  };

  const handleDeleteTask = (_task: Task) => {
    console.log('Delete task:', _task);
  };

  const getTaskStats = () => {
    const stats = {
      queued: 0,
      running: 0,
      completed: 0,
      error: 0,
      cancelled: 0,
      timeout: 0
    };

    tasks.forEach((task) => {
      switch (task.status) {
        case 'queued':
          stats.queued++;
          break;
        case 'running':
          stats.running++;
          break;
        case 'pr_merged':
          stats.completed++;
          break;
        case 'error':
          stats.error++;
          break;
        case 'cancelled':
          stats.cancelled++;
          break;
        case 'timeout':
          stats.timeout++;
          break;
        default:
          break;
      }
    });

    return stats;
  };

  const stats = getTaskStats();

  if (isLoading) {
    return (
      <div className="task-view-loading">
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  return (
    <div className="task-view">
      <div className="task-view-header">
        <h2>任务查看</h2>
        <Space>
          <Radio.Group
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value)}
            buttonStyle="solid"
          >
            <Radio.Button value="kanban">
              <AppstoreOutlined /> 看板
            </Radio.Button>
            <Radio.Button value="table">
              <TableOutlined /> 表格
            </Radio.Button>
          </Radio.Group>
        </Space>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={8} md={6}>
          <Card>
            <Statistic title="排队中" value={stats.queued} valueStyle={{ color: '#8c8c8c' }} />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={6}>
          <Card>
            <Statistic title="运行中" value={stats.running} valueStyle={{ color: '#1890ff' }} />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={6}>
          <Card>
            <Statistic title="已完成" value={stats.completed} valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={6}>
          <Card>
            <Statistic
              title="错误"
              value={stats.error + stats.cancelled + stats.timeout}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

      {tasks.length === 0 ? (
        <Empty description="暂无任务" />
      ) : viewMode === 'kanban' ? (
        <TaskKanban
          tasks={tasks}
          loading={isLoading}
          onTaskClick={handleTaskClick}
          onEdit={handleEditTask}
          onDelete={handleDeleteTask}
        />
      ) : (
        <TaskTable onTaskClick={handleTaskClick} />
      )}

      <TaskModal
        open={detailModalOpen}
        task={selectedTask}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedTask(null);
        }}
      />
    </div>
  );
}
