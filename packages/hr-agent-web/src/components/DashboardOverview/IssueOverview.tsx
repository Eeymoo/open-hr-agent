import { AlertOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useIssues } from '../../hooks/useIssues';
import { OverviewCard } from './OverviewCard';

export function IssueOverview() {
  const navigate = useNavigate();
  const { data, isLoading } = useIssues({ page: 1, pageSize: 100 });

  const issues = data?.issues || [];
  const pagination = data?.pagination;

  const total = pagination?.total || issues.length;

  return (
    <OverviewCard
      title="Issue 总览"
      icon={<AlertOutlined />}
      loading={isLoading}
      onClick={() => navigate('/issues')}
    >
      <div className="overview-stat">
        <span className="overview-stat-label">总 Issue 数</span>
        <span className="overview-stat-value">{total}</span>
      </div>
      <div className="overview-stat">
        <span className="overview-stat-label">最近创建</span>
        <span className="overview-stat-value">{issues.length}</span>
      </div>
    </OverviewCard>
  );
}
