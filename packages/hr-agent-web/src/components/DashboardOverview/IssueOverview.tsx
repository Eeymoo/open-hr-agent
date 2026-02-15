import { AlertOutlined } from '@ant-design/icons';
import { Tag } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useIssues } from '../../hooks/useIssues';
import { OverviewCard } from './OverviewCard';

export function IssueOverview() {
  const navigate = useNavigate();
  const { data, isLoading } = useIssues({ page: 1, pageSize: 100 });

  const issues = data?.issues || [];
  const pagination = data?.pagination;

  const total = pagination?.total || issues.length;

  const inProgressCount = issues.filter((i) => i.completedAt < 0 && i.deletedAt < 0).length;
  const completedCount = issues.filter((i) => i.completedAt >= 0).length;
  const deletedCount = issues.filter((i) => i.deletedAt >= 0).length;

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
      <div className="overview-stat-group">
        <div className="overview-stat-item">
          <Tag color="processing">进行中</Tag>
          <span className="overview-stat-count">{inProgressCount}</span>
        </div>
        <div className="overview-stat-item">
          <Tag color="success">已完成</Tag>
          <span className="overview-stat-count">{completedCount}</span>
        </div>
        <div className="overview-stat-item">
          <Tag color="default">已删除</Tag>
          <span className="overview-stat-count">{deletedCount}</span>
        </div>
      </div>
    </OverviewCard>
  );
}
