import { RobotOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { CSSProperties } from 'react';
import { theme } from 'antd';
import { useCodingAgents, useCAStatus } from '../../hooks/useCas';
import { OverviewCard } from './OverviewCard';

interface CAStats {
  total: number;
  running: number;
  idle: number;
  error: number;
  creating: number;
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
  const { token } = theme.useToken();

  const labelStyle: CSSProperties = {
    color: token.colorTextSecondary
  };

  return (
    <>
      <div style={statStyle}>
        <span style={labelStyle}>总 CA 数</span>
        <span style={valueStyle}>{stats.total}</span>
      </div>
      <div style={statStyle}>
        <span style={labelStyle}>运行中</span>
        <span style={{ ...valueStyle, color: token.colorPrimary }}>{stats.running}</span>
      </div>
      <div style={statStyle}>
        <span style={labelStyle}>空闲</span>
        <span style={{ ...valueStyle, color: token.colorSuccess }}>{stats.idle}</span>
      </div>
      <div style={statStyle}>
        <span style={labelStyle}>错误</span>
        <span style={{ ...valueStyle, color: token.colorError }}>{stats.error}</span>
      </div>
      {stats.creating > 0 && (
        <div style={statStyle}>
          <span style={labelStyle}>创建中</span>
          <span style={{ ...valueStyle, color: token.colorWarning }}>{stats.creating}</span>
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
