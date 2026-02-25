import { FileTextOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { CSSProperties } from 'react';
import { useTasks } from '../../hooks/useTasks';
import { OverviewCard } from './OverviewCard';

const statStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '8px 0'
};

const labelStyle: CSSProperties = {
  color: '#8c8c8c'
};

const valueStyle: CSSProperties = {
  fontSize: 16,
  fontWeight: 600
};

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
      <div style={statStyle}>
        <span style={labelStyle}>总任务数</span>
        <span style={valueStyle}>{stats.total}</span>
      </div>
      <div style={statStyle}>
        <span style={labelStyle}>排队中</span>
        <span style={{ ...valueStyle, color: '#faad14' }}>{stats.queued}</span>
      </div>
      <div style={statStyle}>
        <span style={labelStyle}>运行中</span>
        <span style={{ ...valueStyle, color: '#1890ff' }}>{stats.running}</span>
      </div>
      <div style={statStyle}>
        <span style={labelStyle}>已完成</span>
        <span style={{ ...valueStyle, color: '#52c41a' }}>{stats.completed}</span>
      </div>
      <div style={statStyle}>
        <span style={labelStyle}>错误</span>
        <span style={{ ...valueStyle, color: '#ff4d4f' }}>{stats.error}</span>
      </div>
    </OverviewCard>
  );
}
