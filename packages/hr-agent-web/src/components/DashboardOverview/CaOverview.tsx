import { RobotOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useCodingAgents, useCAStatus } from '../../hooks/useCas';
import { OverviewCard } from './OverviewCard';

interface CAStats {
  total: number;
  running: number;
  idle: number;
  error: number;
  creating: number;
}

function buildCAStats(
  cas: Array<{ id: number }>,
  pagination?: { total?: number },
  caPool?: { busy?: number; idle?: number; error?: number; creating?: number }
): CAStats {
  return {
    total: pagination?.total || cas.length,
    running: caPool?.busy || 0,
    idle: caPool?.idle || 0,
    error: caPool?.error || 0,
    creating: caPool?.creating || 0
  };
}

function useCAStats(): { stats: CAStats; isLoading: boolean } {
  const { data: caListData, isLoading } = useCodingAgents({ page: 1, pageSize: 100 });
  const { data: caStatusData } = useCAStatus();

  const stats = buildCAStats(
    caListData?.cas || [],
    caListData?.pagination,
    caStatusData?.data?.caPool
  );

  return { stats, isLoading };
}

function CAStatsContent({ stats }: { stats: CAStats }) {
  return (
    <>
      <div className="overview-stat">
        <span className="overview-stat-label">总 CA 数</span>
        <span className="overview-stat-value">{stats.total}</span>
      </div>
      <div className="overview-stat">
        <span className="overview-stat-label">运行中</span>
        <span className="overview-stat-value running">{stats.running}</span>
      </div>
      <div className="overview-stat">
        <span className="overview-stat-label">空闲</span>
        <span className="overview-stat-value success">{stats.idle}</span>
      </div>
      <div className="overview-stat">
        <span className="overview-stat-label">错误</span>
        <span className="overview-stat-value error">{stats.error}</span>
      </div>
      {stats.creating > 0 && (
        <div className="overview-stat">
          <span className="overview-stat-label">创建中</span>
          <span className="overview-stat-value warning">{stats.creating}</span>
        </div>
      )}
    </>
  );
}

export function CaOverview() {
  const navigate = useNavigate();
  const { stats, isLoading } = useCAStats();

  return (
    <OverviewCard
      title="CA 总览"
      icon={<RobotOutlined />}
      loading={isLoading}
      onClick={() => navigate('/cas')}
    >
      <CAStatsContent stats={stats} />
    </OverviewCard>
  );
}
