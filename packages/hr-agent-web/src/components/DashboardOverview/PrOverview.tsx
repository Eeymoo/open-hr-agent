import { PullRequestOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { usePRs } from '../../hooks/usePrs';
import { OverviewCard } from './OverviewCard';

export function PrOverview() {
  const navigate = useNavigate();
  const { data, isLoading } = usePRs({ page: 1, pageSize: 100 });

  const prs = data?.prs || [];
  const pagination = data?.pagination;

  const total = pagination?.total || prs.length;

  return (
    <OverviewCard
      title="PR 总览"
      icon={<PullRequestOutlined />}
      loading={isLoading}
      onClick={() => navigate('/prs')}
    >
      <div className="overview-stat">
        <span className="overview-stat-label">总 PR 数</span>
        <span className="overview-stat-value">{total}</span>
      </div>
      <div className="overview-stat">
        <span className="overview-stat-label">最近创建</span>
        <span className="overview-stat-value">{prs.length}</span>
      </div>
    </OverviewCard>
  );
}
