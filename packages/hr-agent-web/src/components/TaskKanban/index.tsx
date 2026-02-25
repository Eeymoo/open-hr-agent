import { useEffect, useState, useCallback } from 'react';
import { Card, Col, Row, Button, Empty, Spin, message } from 'antd';
import { PlusOutlined, DownOutlined, LoadingOutlined } from '@ant-design/icons';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { TaskCard } from '../TaskCard';
import { useReorderTasks } from '../../hooks/useTasks';
import { PRIORITY_LOW, PRIORITY_MEDIUM, PRIORITY_HIGH, type Task } from '../../types/task';

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
const PRIORITY_DIVISOR = 3;
const PRIORITY_TIER_MULTIPLIER = 2;
const PRIORITY_OFFSET_MAX = 10;
const DRAGGING_OPACITY = 0.8;

const calculateNewPriorities = (
  tasks: Task[],
  startIndex: number,
  endIndex: number
): Array<{ taskId: number; priority: number }> => {
  const result: Array<{ taskId: number; priority: number }> = [];
  const reorderedTasks = Array.from(tasks);
  const [movedTask] = reorderedTasks.splice(startIndex, 1);
  reorderedTasks.splice(endIndex, 0, movedTask);

  reorderedTasks.forEach((task, index) => {
    let basePriority: number;
    if (index < reorderedTasks.length / PRIORITY_DIVISOR) {
      basePriority = PRIORITY_HIGH;
    } else if (index < (reorderedTasks.length * PRIORITY_TIER_MULTIPLIER) / PRIORITY_DIVISOR) {
      basePriority = PRIORITY_MEDIUM;
    } else {
      basePriority = PRIORITY_LOW;
    }
    const priority = basePriority + (index % PRIORITY_OFFSET_MAX);
    result.push({ taskId: task.id, priority });
  });

  return result;
};

const groupTasksByStatus = (tasks: Task[]): Record<string, Task[]> => {
  const grouped = tasks.reduce(
    (acc, _task) => {
      const { status } = _task;
      if (!acc[status]) {
        acc[status] = [];
      }
      acc[status].push(_task);
      return acc;
    },
    {} as Record<string, Task[]>
  );

  if (grouped.queued) {
    grouped.queued.sort((a, b) => a.priority - b.priority);
  }

  return grouped;
};

interface KanbanColumnProps {
  status: string;
  title: string;
  tasks: Task[];
  loading?: boolean;
  isReordering: boolean;
  isMain: boolean;
  onTaskClick?: (task: Task) => void;
  onEdit?: (task: Task) => void;
  onDelete?: (task: Task) => void;
}

function KanbanColumn({
  status,
  title,
  tasks: columnTasksList,
  loading,
  isReordering,
  isMain,
  onTaskClick,
  onEdit,
  onDelete
}: KanbanColumnProps) {
  const isDraggable = status === 'queued';

  return (
    <Col xs={24} sm={12} md={8} lg={6} key={status}>
      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>{title}</span>
            <span style={{ color: '#8c8c8c', fontSize: 14 }}>
              ({columnTasksList.length})
              {isReordering && isDraggable && <LoadingOutlined spin style={{ marginLeft: 8 }} />}
            </span>
          </div>
        }
      >
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
            <Spin />
          </div>
        ) : columnTasksList.length === 0 ? (
          <Empty description="暂无任务" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <Droppable droppableId={status} isDropDisabled={!isDraggable}>
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 100 }}
              >
                {columnTasksList.map((task, index) => (
                  <Draggable
                    key={task.id}
                    draggableId={task.id.toString()}
                    index={index}
                    isDragDisabled={!isDraggable}
                  >
                    {(draggableProvided, snapshot) => (
                      <div
                        ref={draggableProvided.innerRef}
                        {...draggableProvided.draggableProps}
                        {...draggableProvided.dragHandleProps}
                        style={{
                          ...draggableProvided.draggableProps.style,
                          opacity: snapshot.isDragging ? DRAGGING_OPACITY : 1
                        }}
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
}

export function TaskKanban({ tasks, loading, onTaskClick, onEdit, onDelete }: TaskKanbanProps) {
  const [showOtherColumns, setShowOtherColumns] = useState(false);
  const [columnTasks, setColumnTasks] = useState<Record<string, Task[]>>({});
  const [isReordering, setIsReordering] = useState(false);
  const reorderTasks = useReorderTasks();

  useEffect(() => {
    setColumnTasks(groupTasksByStatus(tasks));
  }, [tasks]);

  const handleDragEnd = useCallback(
    (result: DropResult) => {
      if (!result.destination) {
        return;
      }

      const sourceColumn = result.source.droppableId;
      const destinationColumn = result.destination.droppableId;

      if (sourceColumn !== 'queued' || destinationColumn !== 'queued') {
        return;
      }

      const items = [...columnTasks[sourceColumn]];
      const [removed] = items.splice(result.source.index, 1);
      items.splice(result.destination.index, 0, removed);

      setColumnTasks({ ...columnTasks, [sourceColumn]: items });

      const taskOrders = calculateNewPriorities(
        columnTasks[sourceColumn],
        result.source.index,
        result.destination.index
      );

      setIsReordering(true);
      reorderTasks.mutate(
        { taskOrders },
        {
          onSuccess: () => {
            message.success('排序已保存');
          },
          onError: () => {
            message.error('排序保存失败');
            setColumnTasks(groupTasksByStatus(tasks));
          },
          onSettled: () => {
            setIsReordering(false);
          }
        }
      );
    },
    [columnTasks, reorderTasks, tasks]
  );

  return (
    <div>
      <DragDropContext onDragEnd={handleDragEnd}>
        <Row gutter={[16, 16]}>
          {MAIN_COLUMNS.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              title={COLUMN_TITLES[status]}
              tasks={columnTasks[status] || []}
              loading={loading}
              isReordering={isReordering}
              isMain={true}
              onTaskClick={onTaskClick}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </Row>

        {showOtherColumns && (
          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            {OTHER_COLUMNS.map((status) => (
              <KanbanColumn
                key={status}
                status={status}
                title={COLUMN_TITLES[status]}
                tasks={columnTasks[status] || []}
                loading={loading}
                isReordering={isReordering}
                isMain={false}
                onTaskClick={onTaskClick}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </Row>
        )}
      </DragDropContext>

      <div style={{ marginTop: 16 }}>
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
