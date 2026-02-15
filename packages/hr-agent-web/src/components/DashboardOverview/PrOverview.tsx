import { PullRequestOutlined } from '@ant-design/icons';
import { Tag } from 'antd';
import { useNavigate } from 'react-router-dom';
import { usePRs } from '../../hooks/usePrs';
import { OverviewCard } from './OverviewCard';

export function PrOverview() {
  const navigate = useNavigate();
  const { data, isLoading } = usePRs({ page: 1, pageSize: 100 });

  const prs = data?.prs || [];
  const pagination = data?.pagination;

  const total = pagination?.total || prs.length;

  const inProgressCount = prs.filter((p) => p.completedAt < 0 && p.deletedAt < 0).length;
  const mergedCount = prs.filter((p) => p.completedAt >= 0).length;
  const deletedCount = prs.filter((p) => p.deletedAt >= 0).length;

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
      <div className="overview-stat-group">
        <div className="overview-stat-item">
          <Tag color="processing">进行中</Tag>
          <span className="overview-stat-count">{inProgressCount}</span>
        </div>
        <div className="overview-stat-item">
          <Tag color="success">已合并</Tag>
          <span className="overview-stat-count">{mergedCount}</span>
        </div>
        <div className="overview-stat-item">
          <Tag color="default">已删除</Tag>
          <span className="overview-stat-count">{deletedCount}</span>
        </div>
      </div>
    </OverviewCard>
  );
}
