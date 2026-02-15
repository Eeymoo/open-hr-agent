import { FileTextOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useTasks } from '../../hooks/useTasks';
import { OverviewCard } from './OverviewCard';

export function TaskOverview() {
  const navigate = useNavigate();
  const { data, isLoading } = useTasks({ pageSize: 100 });

  const tasks = data?.tasks || [];

  const stats = {
    total: tasks.length,
    queued: tasks.filter((t) => t.status === 'queued').length,
    running: tasks.filter((t) => t.status === 'running' || t.status === 'retrying').length,
    completed: tasks.filter((t) => t.status === 'completed').length,
    error: tasks.filter((t) => t.status === 'error').length
  };

  return (
    <OverviewCard
      title="任务总览"
      icon={<FileTextOutlined />}
      loading={isLoading}
      onClick={() => navigate('/tasks')}
    >
      <div className="overview-stat">
        <span className="overview-stat-label">总任务数</span>
        <span className="overview-stat-value">{stats.total}</span>
      </div>
      <div className="overview-stat">
        <span className="overview-stat-label">排队中</span>
        <span className="overview-stat-value warning">{stats.queued}</span>
      </div>
      <div className="overview-stat">
        <span className="overview-stat-label">运行中</span>
        <span className="overview-stat-value running">{stats.running}</span>
      </div>
      <div className="overview-stat">
        <span className="overview-stat-label">已完成</span>
        <span className="overview-stat-value success">{stats.completed}</span>
      </div>
      <div className="overview-stat">
        <span className="overview-stat-label">错误</span>
        <span className="overview-stat-value error">{stats.error}</span>
      </div>
    </OverviewCard>
  );
}
