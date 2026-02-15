import { AlertOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useIssues } from '../../hooks/useIssues';
import { OverviewCard } from './OverviewCard';

interface IssueStats {
  total: number;
  inProgress: number;
  completed: number;
  deleted: number;
}

function useIssueStats(): { stats: IssueStats; isLoading: boolean } {
  const { data, isLoading } = useIssues({ page: 1, pageSize: 100 });

  const issues = data?.issues || [];
  const pagination = data?.pagination;

  const stats: IssueStats = {
    total: pagination?.total || issues.length,
    inProgress: issues.filter((i) => i.completedAt < 0 && i.deletedAt < 0).length,
    completed: issues.filter((i) => i.completedAt >= 0).length,
    deleted: issues.filter((i) => i.deletedAt >= 0).length
  };

  return { stats, isLoading };
}

function IssueStatsContent({ stats }: { stats: IssueStats }) {
  return (
    <>
      <div className="overview-stat">
        <span className="overview-stat-label">总 Issue 数</span>
        <span className="overview-stat-value">{stats.total}</span>
      </div>
      <div className="overview-stat">
        <span className="overview-stat-label">进行中</span>
        <span className="overview-stat-value running">{stats.inProgress}</span>
      </div>
      <div className="overview-stat">
        <span className="overview-stat-label">已完成</span>
        <span className="overview-stat-value success">{stats.completed}</span>
      </div>
      <div className="overview-stat">
        <span className="overview-stat-label">已删除</span>
        <span className="overview-stat-value error">{stats.deleted}</span>
      </div>
    </>
  );
}

export function IssueOverview() {
  const navigate = useNavigate();
  const { stats, isLoading } = useIssueStats();

  return (
    <OverviewCard
      title="Issue 总览"
      icon={<AlertOutlined />}
      loading={isLoading}
      onClick={() => navigate('/issues')}
    >
      <IssueStatsContent stats={stats} />
    </OverviewCard>
  );
}
