import { PullRequestOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { usePRs } from '../../hooks/usePrs';
import { OverviewCard } from './OverviewCard';

interface PRStats {
  total: number;
  inProgress: number;
  merged: number;
  deleted: number;
}

function usePRStats(): { stats: PRStats; isLoading: boolean } {
  const { data, isLoading } = usePRs({ page: 1, pageSize: 100 });

  const prs = data?.prs || [];
  const pagination = data?.pagination;

  const stats: PRStats = {
    total: pagination?.total || prs.length,
    inProgress: prs.filter((p) => p.completedAt < 0 && p.deletedAt < 0).length,
    merged: prs.filter((p) => p.completedAt >= 0).length,
    deleted: prs.filter((p) => p.deletedAt >= 0).length
  };

  return { stats, isLoading };
}

function PRStatsContent({ stats }: { stats: PRStats }) {
  return (
    <>
      <div className="overview-stat">
        <span className="overview-stat-label">总 PR 数</span>
        <span className="overview-stat-value">{stats.total}</span>
      </div>
      <div className="overview-stat">
        <span className="overview-stat-label">进行中</span>
        <span className="overview-stat-value running">{stats.inProgress}</span>
      </div>
      <div className="overview-stat">
        <span className="overview-stat-label">已合并</span>
        <span className="overview-stat-value success">{stats.merged}</span>
      </div>
      <div className="overview-stat">
        <span className="overview-stat-label">已删除</span>
        <span className="overview-stat-value error">{stats.deleted}</span>
      </div>
    </>
  );
}

export function PrOverview() {
  const navigate = useNavigate();
  const { stats, isLoading } = usePRStats();

  return (
    <OverviewCard
      title="PR 总览"
      icon={<PullRequestOutlined />}
      loading={isLoading}
      onClick={() => navigate('/prs')}
    >
      <PRStatsContent stats={stats} />
    </OverviewCard>
  );
}
