import { useEffect, useState } from 'react';
import { Card, Col, Row, Button, Empty, Spin } from 'antd';
import { PlusOutlined, DownOutlined } from '@ant-design/icons';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { TaskCard } from '../TaskCard';
import type { Task } from '../../types/task';
import './index.css';

interface TaskKanbanProps {
  tasks: Task[];
  loading?: boolean;
  onTaskClick?: (task: Task) => void;
  onEdit?: (task: Task) => void;
  onDelete?: (task: Task) => void;
}

const COLUMN_TITLES: Record<string, string> = {
  queued: '排队中',
  running: '运行中',
  pr_merged: '已完成',
  error: '错误',
  cancelled: '已取消',
  timeout: '超时'
};

const MAIN_COLUMNS = ['queued', 'running', 'pr_merged'];
const OTHER_COLUMNS = ['error', 'cancelled', 'timeout'];

export function TaskKanban({ tasks, loading, onTaskClick, onEdit, onDelete }: TaskKanbanProps) {
  const [showOtherColumns, setShowOtherColumns] = useState(false);
  const [columnTasks, setColumnTasks] = useState<Record<string, Task[]>>({});

  useEffect(() => {
    const grouped = tasks.reduce(
      (acc, task) => {
        const status = task.status;
        if (!acc[status]) {
          acc[status] = [];
        }
        acc[status].push(task);
        return acc;
      },
      {} as Record<string, Task[]>
    );

    setColumnTasks(grouped);
  }, [tasks]);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const sourceColumn = result.source.droppableId;
    const destinationColumn = result.destination.droppableId;

    if (sourceColumn === destinationColumn) {
      const items = [...columnTasks[sourceColumn]];
      const [removed] = items.splice(result.source.index, 1);
      items.splice(result.destination.index, 0, removed);
      setColumnTasks({ ...columnTasks, [sourceColumn]: items });
    } else {
      if (sourceColumn !== 'queued' || destinationColumn !== 'queued') {
        return;
      }

      const sourceItems = [...columnTasks[sourceColumn]];
      const destItems = [...columnTasks[destinationColumn]];
      const [removed] = sourceItems.splice(result.source.index, 1);
      destItems.splice(result.destination.index, 0, removed);
      const newColumnTasks = { ...columnTasks };
      newColumnTasks[sourceColumn] = sourceItems;
      newColumnTasks[destinationColumn] = destItems;
      setColumnTasks(newColumnTasks);
    }
  };

  const renderColumn = (status: string, title: string, isMain: boolean = true) => {
    const columnTasksList = columnTasks[status] || [];
    const isDraggable = status === 'queued';

    return (
      <Col xs={24} sm={12} md={8} lg={6} key={status}>
        <Card
          title={
            <div className="kanban-column-header">
              <span>{title}</span>
              <span className="task-count">({columnTasksList.length})</span>
            </div>
          }
          className="kanban-column"
        >
          {loading ? (
            <div className="kanban-loading">
              <Spin />
            </div>
          ) : columnTasksList.length === 0 ? (
            <Empty description="暂无任务" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          ) : (
            <Droppable droppableId={status} isDropDisabled={!isDraggable}>
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="task-list">
                  {columnTasksList.map((task, index) => (
                    <Draggable
                      key={task.id}
                      draggableId={task.id.toString()}
                      index={index}
                      isDragDisabled={!isDraggable}
                    >
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`task-item ${snapshot.isDragging ? 'dragging' : ''}`}
                        >
                          <TaskCard
                            task={task}
                            onClick={() => onTaskClick?.(task)}
                            onEdit={() => onEdit?.(task)}
                            onDelete={() => onDelete?.(task)}
                            showActions={isMain}
                          />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          )}
        </Card>
      </Col>
    );
  };

  return (
    <div className="task-kanban">
      <DragDropContext onDragEnd={handleDragEnd}>
        <Row gutter={[16, 16]}>
          {MAIN_COLUMNS.map((status) => renderColumn(status, COLUMN_TITLES[status], true))}
        </Row>

        {showOtherColumns && (
          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            {OTHER_COLUMNS.map((status) => renderColumn(status, COLUMN_TITLES[status], false))}
          </Row>
        )}
      </DragDropContext>

      <div className="kanban-actions">
        <Button
          type="link"
          icon={showOtherColumns ? <DownOutlined /> : <PlusOutlined />}
          onClick={() => setShowOtherColumns(!showOtherColumns)}
        >
          {showOtherColumns ? '隐藏其他队列' : '查看其他队列'}
        </Button>
      </div>
    </div>
  );
}
