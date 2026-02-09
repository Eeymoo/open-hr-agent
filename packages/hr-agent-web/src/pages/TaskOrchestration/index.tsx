import { useState } from 'react';
import { Button, Radio, Space, Empty, Spin } from 'antd';
import { PlusOutlined, TableOutlined, AppstoreOutlined } from '@ant-design/icons';
import { TaskCard } from '../../components/TaskCard';
import { TaskTable } from '../../components/TaskTable';
import { TaskFormModal } from '../../components/TaskFormModal';
import { TaskModal } from '../../components/TaskModal';
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask } from '../../hooks/useTasks';
import type { Task, CreateTaskDto, UpdateTaskDto } from '../../types/task';
import './index.css';

type ViewMode = 'card' | 'table';

export function TaskOrchestration() {
  const [viewMode, setViewMode] = useState<ViewMode>('card');
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
      <div className="task-orchestration-header">
        <h2>任务编排</h2>
        <Space>
          <Radio.Group
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value)}
            buttonStyle="solid"
          >
            <Radio.Button value="card">
              <AppstoreOutlined /> 卡片
            </Radio.Button>
            <Radio.Button value="table">
              <TableOutlined /> 表格
            </Radio.Button>
          </Radio.Group>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAddTask}>
            添加任务
          </Button>
        </Space>
      </div>

      {tasks.length === 0 ? (
        <Empty description="暂无任务" />
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
