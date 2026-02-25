import { Card, Skeleton, Typography } from 'antd';
import type { ReactNode } from 'react';

const { Title } = Typography;

interface OverviewCardProps {
  title: string;
  icon: ReactNode;
  loading?: boolean;
  children: ReactNode;
  onClick?: () => void;
}

export function OverviewCard({ title, icon, loading, children, onClick }: OverviewCardProps) {
  return (
    <Card hoverable={!!onClick} onClick={onClick}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <div style={{ fontSize: 20, color: '#9333EA' }}>{icon}</div>
        <Title level={4} style={{ margin: 0 }}>
          {title}
        </Title>
      </div>
      <div>
        {loading ? <Skeleton active paragraph={{ rows: 2 }} /> : children}
      </div>
    </Card>
  );
}
