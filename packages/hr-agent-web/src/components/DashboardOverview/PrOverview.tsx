import { PullRequestOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { CSSProperties } from 'react';
import { theme } from 'antd';
import { usePRs } from '../../hooks/usePrs';
import { OverviewCard } from './OverviewCard';

interface PRStats {
  total: number;
  inProgress: number;
  merged: number;
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
  const { token } = theme.useToken();

  const labelStyle: CSSProperties = {
    color: token.colorTextSecondary
  };

  return (
    <>
      <div style={statStyle}>
        <span style={labelStyle}>总 PR 数</span>
        <span style={valueStyle}>{stats.total}</span>
      </div>
      <div style={statStyle}>
        <span style={labelStyle}>进行中</span>
        <span style={{ ...valueStyle, color: token.colorPrimary }}>{stats.inProgress}</span>
      </div>
      <div style={statStyle}>
        <span style={labelStyle}>已合并</span>
        <span style={{ ...valueStyle, color: token.colorSuccess }}>{stats.merged}</span>
      </div>
      <div style={statStyle}>
        <span style={labelStyle}>已删除</span>
        <span style={{ ...valueStyle, color: token.colorError }}>{stats.deleted}</span>
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
