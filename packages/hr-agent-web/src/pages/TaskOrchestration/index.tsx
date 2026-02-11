import { useState } from 'react';
import { Button, Radio, Space, Empty, Spin } from 'antd';
import {
  PlusOutlined,
  TableOutlined,
  AppstoreOutlined,
  DashboardOutlined
} from '@ant-design/icons';
import { TaskCard } from '../../components/TaskCard';
import { TaskTable } from '../../components/TaskTable';
import { TaskFormModal } from '../../components/TaskFormModal';
import { TaskModal } from '../../components/TaskModal';
import { StatsDashboard } from '../../components/StatsDashboard';
import { TaskKanban } from '../../components/TaskKanban';
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask } from '../../hooks/useTasks';
import type { Task, CreateTaskDto, UpdateTaskDto } from '../../types/task';
import './index.css';

type ViewMode = 'card' | 'table' | 'kanban';

export function TaskOrchestration() {
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const { data, isLoading } = useTasks();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const tasks = data?.tasks || [];

  const handleAddTask = () => {
    setEditingTask(null);
    setFormModalOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setFormModalOpen(true);
  };

  const handleDeleteTask = (task: Task) => {
    deleteTask.mutate(task.id);
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setDetailModalOpen(true);
  };

  const handleFormSubmit = (formData: CreateTaskDto | UpdateTaskDto) => {
    if (editingTask) {
      updateTask.mutate(
        { id: editingTask.id, data: formData as UpdateTaskDto },
        {
          onSuccess: () => {
            setFormModalOpen(false);
            setEditingTask(null);
          }
        }
      );
    } else {
      createTask.mutate(formData as CreateTaskDto, {
        onSuccess: () => {
          setFormModalOpen(false);
        }
      });
    }
  };

  if (isLoading) {
    return (
      <div className="task-orchestration-loading">
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  return (
    <div className="task-orchestration">
      <StatsDashboard tasks={tasks} />

      <div className="task-orchestration-content">
        <div className="task-orchestration-header">
          <div className="header-left">
            <h2>任务列表</h2>
            <span className="task-count">{tasks.length} 个任务</span>
          </div>
          <Space>
            <Radio.Group
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value)}
              buttonStyle="solid"
              className="view-toggle"
            >
              <Radio.Button value="kanban">
                <DashboardOutlined /> 看板
              </Radio.Button>
              <Radio.Button value="card">
                <AppstoreOutlined /> 卡片
              </Radio.Button>
              <Radio.Button value="table">
                <TableOutlined /> 表格
              </Radio.Button>
            </Radio.Group>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAddTask}
              className="add-task-btn"
            >
              添加任务
            </Button>
          </Space>
        </div>

        {tasks.length === 0 ? (
          <Empty description="暂无任务" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : viewMode === 'kanban' ? (
          <TaskKanban
            tasks={tasks}
            onTaskClick={handleTaskClick}
            onEdit={handleEditTask}
            onDelete={handleDeleteTask}
          />
        ) : viewMode === 'card' ? (
          <div className="task-cards">
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onClick={() => handleTaskClick(task)}
                onEdit={() => handleEditTask(task)}
                onDelete={() => handleDeleteTask(task)}
              />
            ))}
          </div>
        ) : (
          <TaskTable onTaskClick={handleTaskClick} />
        )}
      </div>

      <TaskFormModal
        open={formModalOpen}
        task={editingTask}
        mode={editingTask ? 'edit' : 'create'}
        onCancel={() => {
          setFormModalOpen(false);
          setEditingTask(null);
        }}
        onSubmit={handleFormSubmit}
        loading={createTask.isPending || updateTask.isPending}
      />

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
