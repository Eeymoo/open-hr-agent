import { useState } from 'react';
import { Button, Radio, Space, Empty, Spin, Select, Tooltip } from 'antd';
import {
  PlusOutlined,
  TableOutlined,
  AppstoreOutlined,
  DashboardOutlined,
  FilterOutlined,
  UnorderedListOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { TaskCard } from '../../components/TaskCard';
import { TaskTable } from '../../components/TaskTable';
import { TaskFormModal } from '../../components/TaskFormModal';
import { TaskModal } from '../../components/TaskModal';
import { StatsDashboard } from '../../components/StatsDashboard';
import { TaskKanban } from '../../components/TaskKanban';
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask } from '../../hooks/useTasks';
import { TASK_TAG_LABELS, type Task, type CreateTaskDto, type UpdateTaskDto } from '../../types/task';
import './index.css';

type ViewMode = 'card' | 'table' | 'kanban';

const DEFAULT_FILTER_TAGS = ['requires:ca', 'agent:coding', 'agent:review', 'agent:test'];

const TAG_OPTIONS = Object.entries(TASK_TAG_LABELS).map(([value, label]) => ({
  value,
  label
}));

interface TaskViewProps {
  viewMode: ViewMode;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}

function TaskView({ viewMode, tasks, onTaskClick, onEdit, onDelete }: TaskViewProps) {
  if (tasks.length === 0) {
    return <Empty description="暂无任务" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  }

  if (viewMode === 'kanban') {
    return <TaskKanban tasks={tasks} onTaskClick={onTaskClick} onEdit={onEdit} onDelete={onDelete} />;
  }

  if (viewMode === 'card') {
    return (
      <div className="task-cards">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onClick={() => onTaskClick(task)}
            onEdit={() => onEdit(task)}
            onDelete={() => onDelete(task)}
          />
        ))}
      </div>
    );
  }

  return <TaskTable onTaskClick={onTaskClick} />;
}

interface TaskHeaderProps {
  taskCount: number;
  viewMode: ViewMode;
  filterTags: string[];
  onViewModeChange: (mode: ViewMode) => void;
  onFilterTagsChange: (tags: string[]) => void;
  onAddTask: () => void;
  onViewList: () => void;
}

function TaskHeader({
  taskCount,
  viewMode,
  filterTags,
  onViewModeChange,
  onFilterTagsChange,
  onAddTask,
  onViewList
}: TaskHeaderProps) {
  return (
    <div className="task-orchestration-header">
      <div className="header-left">
        <h2>任务列表</h2>
        <span className="task-count">{taskCount} 个任务</span>
      </div>
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
        <Radio.Group
          value={viewMode}
          onChange={(e) => onViewModeChange(e.target.value)}
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
        <Tooltip title="查看完整列表">
          <Button icon={<UnorderedListOutlined />} onClick={onViewList}>
            列表
          </Button>
        </Tooltip>
        <Button type="primary" icon={<PlusOutlined />} onClick={onAddTask} className="add-task-btn">
          添加任务
        </Button>
      </Space>
    </div>
  );
}

export function TaskOrchestration() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [filterTags, setFilterTags] = useState<string[]>(DEFAULT_FILTER_TAGS);

  const { data, isLoading } = useTasks({ tags: filterTags });
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
        <TaskHeader
          taskCount={tasks.length}
          viewMode={viewMode}
          filterTags={filterTags}
          onViewModeChange={setViewMode}
          onFilterTagsChange={setFilterTags}
          onAddTask={handleAddTask}
          onViewList={() => navigate('/tasks')}
        />
        <TaskView
          viewMode={viewMode}
          tasks={tasks}
          onTaskClick={handleTaskClick}
          onEdit={handleEditTask}
          onDelete={handleDeleteTask}
        />
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
