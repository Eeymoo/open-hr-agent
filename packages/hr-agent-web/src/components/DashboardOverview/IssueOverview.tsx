import { AlertOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { CSSProperties } from 'react';
import { theme } from 'antd';
import { useIssues } from '../../hooks/useIssues';
import { OverviewCard } from './OverviewCard';

interface IssueStats {
  total: number;
  inProgress: number;
  completed: number;
  deleted: number;
}

const statStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '8px 0'
};

const valueStyle: CSSProperties = {
  fontSize: 16,
  fontWeight: 600
};

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
  const { token } = theme.useToken();

  const labelStyle: CSSProperties = {
    color: token.colorTextSecondary
  };

  return (
    <>
      <div style={statStyle}>
        <span style={labelStyle}>总 Issue 数</span>
        <span style={valueStyle}>{stats.total}</span>
      </div>
      <div style={statStyle}>
        <span style={labelStyle}>进行中</span>
        <span style={{ ...valueStyle, color: token.colorPrimary }}>{stats.inProgress}</span>
      </div>
      <div style={statStyle}>
        <span style={labelStyle}>已完成</span>
        <span style={{ ...valueStyle, color: token.colorSuccess }}>{stats.completed}</span>
      </div>
      <div style={statStyle}>
        <span style={labelStyle}>已删除</span>
        <span style={{ ...valueStyle, color: token.colorError }}>{stats.deleted}</span>
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
